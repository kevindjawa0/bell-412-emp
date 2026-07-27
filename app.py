from __future__ import annotations

import base64
import copy
import hmac
import html
import json
import mimetypes
from io import BytesIO
from pathlib import Path

import streamlit as st

from process_basic_inspection import build_basic_inspection_data
from process_utilization import process_utilization


APP_DIR = Path(__file__).resolve().parent
ASSET_DIR = APP_DIR / "assets"
UTILIZATION_JSON = APP_DIR / "utilization_data.json"
BASIC_INSPECTION_JSON = APP_DIR / "basic_inspection_data.json"
LOGIN_AIRCRAFT_IMAGE = ASSET_DIR / "airfast_aircraft.jpg"
LOGIN_AIRFAST_LOGO = ASSET_DIR / "airfast_logo.png"
LOGIN_JAWS_LOGO = ASSET_DIR / "jaws_logo.png"
AUTH_STATE_KEY = "authenticated"


st.set_page_config(
    page_title="Equalizing Maintenance Dashboard",
    layout="wide",
)


def resolve_app_path(file_name: str | Path) -> Path:
    path = Path(file_name)
    if path.is_absolute():
        return path
    return APP_DIR / path


def app_relative_label(path: Path) -> str:
    try:
        return path.relative_to(APP_DIR).as_posix()
    except ValueError:
        return path.name


@st.cache_data(show_spinner=False)
def read_text_asset(file_name: str) -> str:
    return resolve_app_path(file_name).read_text(encoding="utf-8")


@st.cache_data(show_spinner=False)
def read_json_asset(file_name: str) -> dict:
    return json.loads(read_text_asset(file_name))


@st.cache_data(show_spinner=False)
def asset_data_uri(file_name: str | Path) -> str:
    path = resolve_app_path(file_name)
    if not path.exists():
        return ""

    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


@st.cache_data(show_spinner="Processing utilization workbook...")
def process_utilization_upload(file_bytes: bytes, file_name: str) -> dict:
    buffer = BytesIO(file_bytes)
    buffer.name = file_name
    return process_utilization(buffer)


@st.cache_data(show_spinner="Processing maintenance program workbook...")
def process_basic_inspection_upload(file_bytes: bytes, file_name: str) -> dict:
    buffer = BytesIO(file_bytes)
    buffer.name = file_name
    return build_basic_inspection_data(buffer)


def with_embedded_aircraft_images(payload: dict) -> dict:
    data = copy.deepcopy(payload)

    for aircraft in data.get("aircraft", []):
        image_name = aircraft.get("image")
        if image_name:
            aircraft["image"] = asset_data_uri(image_name)

    return data


def build_dashboard_html(utilization_payload: dict, basic_payload: dict) -> str:
    html = read_text_asset("index.html")
    styles = read_text_asset("styles.css").replace(
        'url("background_image.png")',
        f'url("{asset_data_uri("background_image.png")}")',
    )

    utilization_payload = with_embedded_aircraft_images(utilization_payload)
    html = html.replace('src="logo.png"', f'src="{asset_data_uri("logo.png")}"')
    html = html.replace('src="jaws_logo.png"', f'src="{asset_data_uri("jaws_logo.png")}"')
    html = html.replace('<link rel="stylesheet" href="styles.css" />', f"<style>{styles}</style>")
    html = html.replace(
        '<script src="utilization_data.js"></script>',
        f"<script>window.UTILIZATION_DATA = {json.dumps(utilization_payload)};</script>",
    )
    html = html.replace(
        '<script src="basic_inspection_data.js"></script>',
        f"<script>window.BASIC_INSPECTION_DATA = {json.dumps(basic_payload)};</script>",
    )
    html = html.replace(
        '<script src="app.js"></script>',
        f"<script>{read_text_asset('app.js')}</script>",
    )
    return html


def get_auth_credentials() -> tuple[str | None, str | None]:
    try:
        auth_config = st.secrets.get("authentication", {})
    except Exception:
        return None, None

    expected_username = auth_config.get("username")
    expected_password = auth_config.get("password")
    if not expected_username or not expected_password:
        return None, None
    return str(expected_username), str(expected_password)


def auth_is_configured() -> bool:
    expected_username, expected_password = get_auth_credentials()
    return bool(expected_username and expected_password)


def check_credentials(username: str, password: str) -> bool:
    expected_username, expected_password = get_auth_credentials()
    if not expected_username or not expected_password:
        return False

    return hmac.compare_digest(username, expected_username) and hmac.compare_digest(password, expected_password)


def logout() -> None:
    st.session_state[AUTH_STATE_KEY] = False
    st.session_state.pop("login_error", None)
    st.session_state.pop("login_username", None)
    st.session_state.pop("login_password", None)


def login_asset_markup(path: Path, alt_text: str, class_name: str) -> str:
    uri = asset_data_uri(path)
    if uri:
        return f'<img src="{uri}" alt="{html.escape(alt_text)}" class="{class_name}" />'

    missing_label = html.escape(app_relative_label(path))
    return f'<div class="login-logo-placeholder">{missing_label}</div>'


def render_login_page() -> None:
    aircraft_uri = asset_data_uri(LOGIN_AIRCRAFT_IMAGE)
    background_style = (
        f'background-image: linear-gradient(90deg, rgba(5, 25, 46, 0.2), rgba(5, 25, 46, 0.55)), '
        f'url("{aircraft_uri}");'
        if aircraft_uri
        else ""
    )
    image_warning = (
        ""
        if aircraft_uri
        else f'<div class="login-image-warning">Missing aircraft image<br><span>{html.escape(app_relative_label(LOGIN_AIRCRAFT_IMAGE))}</span></div>'
    )

    st.markdown(
        f"""
        <style>
            #MainMenu, footer, header, [data-testid="stSidebar"] {{
                visibility: hidden;
                display: none;
            }}

            .stApp {{
                min-height: 100vh;
                background: #05192E;
                color: #1E293B;
                font-family: Inter, "Helvetica Neue", Arial, sans-serif;
            }}

            [data-testid="stAppViewContainer"] > .main {{
                background: transparent;
            }}

            [data-testid="stToolbar"] {{
                display: none;
            }}

            .block-container {{
                width: clamp(360px, 34vw, 480px) !important;
                max-width: clamp(360px, 34vw, 480px) !important;
                min-height: 100vh;
                margin: 0 !important;
                padding: clamp(32px, 6vh, 62px) clamp(26px, 3vw, 44px) !important;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
                box-shadow: 18px 0 60px rgba(5, 25, 46, 0.22);
                position: relative;
                z-index: 2;
            }}

            .block-container::before {{
                content: "";
                position: fixed;
                top: 0;
                left: 0;
                width: clamp(360px, 34vw, 480px);
                height: 8px;
                background: #F9B515;
                z-index: 5;
            }}

            .login-background-panel {{
                position: fixed;
                inset: 0 0 0 clamp(360px, 34vw, 480px);
                z-index: 0;
                background-color: #05192E;
                background-size: cover;
                background-position: center;
            }}

            .login-background-panel::after {{
                content: "";
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(180deg, rgba(5, 25, 46, 0.1) 0%, rgba(5, 25, 46, 0.45) 100%),
                    linear-gradient(90deg, rgba(5, 25, 46, 0.2) 0%, rgba(5, 25, 46, 0.0) 36%);
            }}

            .login-brand-row {{
                display: grid;
                gap: 18px;
                margin-bottom: clamp(34px, 6vh, 60px);
            }}

            .login-logo-card {{
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 86px;
                padding: 18px 20px;
                background: #FFFFFF;
                border: 1px solid rgba(77, 105, 136, 0.2);
                border-radius: 18px;
                box-shadow: 0 16px 34px rgba(5, 25, 46, 0.08);
            }}

            .login-logo-jaws {{
                width: min(255px, 100%);
                max-height: 74px;
                object-fit: contain;
            }}

            .login-logo-airfast {{
                width: min(230px, 100%);
                max-height: 68px;
                object-fit: contain;
            }}

            .login-logo-placeholder {{
                width: 100%;
                padding: 14px 16px;
                border: 1px dashed rgba(12, 82, 138, 0.35);
                border-radius: 14px;
                background: rgba(12, 82, 138, 0.06);
                color: #4D6988;
                font-size: 0.82rem;
                font-weight: 700;
                text-align: center;
            }}

            .login-kicker {{
                margin: 0 0 12px;
                color: #0C528A;
                font-size: 0.78rem;
                font-weight: 800;
                letter-spacing: 0.18em;
                text-transform: uppercase;
            }}

            .login-heading {{
                margin: 0 0 14px;
                color: #05192E;
                font-size: clamp(2rem, 4vw, 2.8rem);
                line-height: 1.05;
                font-weight: 800;
                letter-spacing: 0;
            }}

            .login-copy {{
                max-width: 36rem;
                margin: 0 0 30px;
                color: #4D6988;
                font-size: 1rem;
                line-height: 1.65;
                font-weight: 500;
            }}

            div[data-testid="stForm"] {{
                border: 0;
                padding: 0;
                background: transparent;
            }}

            div[data-testid="stTextInput"] label {{
                color: #05192E;
                font-size: 0.88rem;
                font-weight: 800;
            }}

            div[data-testid="stTextInput"] input {{
                height: 48px;
                border: 1px solid rgba(77, 105, 136, 0.32);
                border-radius: 14px;
                background: #FFFFFF;
                color: #05192E;
                box-shadow: 0 8px 24px rgba(5, 25, 46, 0.06);
            }}

            div[data-testid="stTextInput"] input:focus {{
                border-color: #F9B515;
                box-shadow: 0 0 0 3px rgba(249, 181, 21, 0.22);
            }}

            div[data-testid="stFormSubmitButton"] button {{
                height: 48px;
                margin-top: 8px;
                border: 0;
                border-radius: 14px;
                background: #F9B515;
                color: #05192E;
                font-weight: 900;
                letter-spacing: 0.04em;
                box-shadow: 0 18px 30px rgba(249, 181, 21, 0.24);
            }}

            div[data-testid="stFormSubmitButton"] button:hover {{
                background: #FFC536;
                color: #05192E;
                border: 0;
            }}

            div[data-testid="stAlert"] {{
                border-radius: 14px;
            }}

            .login-image-warning {{
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 36px;
                color: rgba(255, 255, 255, 0.88);
                text-align: center;
                font-weight: 800;
            }}

            .login-image-warning span {{
                color: rgba(255, 255, 255, 0.64);
                font-size: 0.9rem;
                font-weight: 600;
            }}

            @media (max-width: 760px) {{
                .login-background-panel {{
                    inset: 0;
                    opacity: 0.24;
                }}

                .block-container {{
                    width: 100% !important;
                    max-width: 100% !important;
                    min-height: 100vh;
                    padding: 32px 22px !important;
                    background: rgba(255, 255, 255, 0.96);
                    backdrop-filter: blur(14px);
                }}

                .block-container::before {{
                    width: 100%;
                }}
            }}
        </style>
        <div class="login-background-panel" style='{background_style}'>{image_warning}</div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        f"""
        <div class="login-brand-row">
            <div class="login-logo-card">
                {login_asset_markup(LOGIN_JAWS_LOGO, "JAWS logo", "login-logo-jaws")}
            </div>
            <div class="login-logo-card">
                {login_asset_markup(LOGIN_AIRFAST_LOGO, "AIRFAST Indonesia logo", "login-logo-airfast")}
            </div>
        </div>
        <p class="login-kicker">AIRFAST Indonesia</p>
        <h1 class="login-heading">Maintenance Planning Dashboard</h1>
        <p class="login-copy">Secure access for aircraft utilization, basic inspection modeling, and equalized maintenance planning.</p>
        """,
        unsafe_allow_html=True,
    )

    if not auth_is_configured():
        st.warning("Authentication is not configured. Add Streamlit secrets before signing in.")

    with st.form("login_form", clear_on_submit=False):
        username = st.text_input("Username", key="login_username", placeholder="Username")
        password = st.text_input("Password", type="password", key="login_password", placeholder="Password")
        submitted = st.form_submit_button("Login", use_container_width=True)

    if submitted:
        if check_credentials(username.strip(), password):
            st.session_state[AUTH_STATE_KEY] = True
            st.session_state.pop("login_error", None)
            st.rerun()
        else:
            st.session_state["login_error"] = "Incorrect username or password."

    if st.session_state.get("login_error"):
        st.error(st.session_state["login_error"])


def render_authenticated_styles() -> None:
    st.markdown(
        """
        <style>
            #MainMenu, footer {
                visibility: hidden;
            }

            .block-container {
                max-width: 100%;
                padding-top: 1.5rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def load_utilization_data(uploaded_file) -> tuple[dict, str]:
    if uploaded_file is not None:
        return (
            process_utilization_upload(uploaded_file.getvalue(), uploaded_file.name),
            f"Using uploaded utilization workbook: {uploaded_file.name}",
        )

    return read_json_asset(UTILIZATION_JSON.name), "Using bundled utilization snapshot. Upload a workbook for live data."


def load_basic_inspection_data(uploaded_file) -> tuple[dict, str]:
    if uploaded_file is not None:
        return (
            process_basic_inspection_upload(uploaded_file.getvalue(), uploaded_file.name),
            f"Using uploaded maintenance program workbook: {uploaded_file.name}",
        )

    return read_json_asset(BASIC_INSPECTION_JSON.name), "Using bundled basic-inspection snapshot."


def render_main_app() -> None:
    render_authenticated_styles()

    title_col, logout_col = st.columns([0.78, 0.22], vertical_alignment="center")
    with title_col:
        st.title("Equalizing Maintenance Program")
    with logout_col:
        if st.button("Logout", use_container_width=True):
            logout()
            st.rerun()

    with st.expander("Deployment data inputs", expanded=True):
        st.caption(
            "Upload confidential Excel workbooks at runtime. They are processed in memory and do not need to be committed."
        )
        utilization_upload = st.file_uploader(
            "Aircraft utilization workbook",
            type=["xlsx", "xlsm"],
            help="Expected columns include Registration, Flight Date, FH, and FC.",
        )
        maintenance_upload = st.file_uploader(
            "Maintenance program workbook",
            type=["xlsx", "xlsm"],
            help="Optional. If omitted, the bundled generated basic-inspection snapshot is used.",
        )

    try:
        utilization_data, utilization_status = load_utilization_data(utilization_upload)
        basic_inspection_data, basic_status = load_basic_inspection_data(maintenance_upload)
    except Exception as exc:
        st.error(f"Workbook processing failed: {exc}")
        st.stop()

    st.caption(utilization_status)
    st.caption(basic_status)

    st.iframe(
        build_dashboard_html(utilization_data, basic_inspection_data),
        width="stretch",
        height=1300,
    )


def main() -> None:
    st.session_state.setdefault(AUTH_STATE_KEY, False)
    if not st.session_state[AUTH_STATE_KEY]:
        render_login_page()
        st.stop()

    render_main_app()


main()
