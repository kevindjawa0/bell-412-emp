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
LOGIN_AIRCRAFT_IMAGE = ASSET_DIR / "airfast_auth_background_portrait.png"
LOGIN_AIRFAST_LOGO = ASSET_DIR / "airfast_logo_cropped.png"
LOGIN_JAWS_LOGO = ASSET_DIR / "jaws_login_logo.png"
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
    ).replace(
        'url("assets/airfast_auth_background_portrait.png")',
        f'url("{asset_data_uri("assets/airfast_auth_background_portrait.png")}")',
    )
    app_script = read_text_asset("app.js").replace(
        '"assets/eye_open.png"',
        json.dumps(asset_data_uri("assets/eye_open.png")),
    ).replace(
        '"assets/eye_closed.png"',
        json.dumps(asset_data_uri("assets/eye_closed.png")),
    )

    utilization_payload = with_embedded_aircraft_images(utilization_payload)
    html = html.replace('src="logo.png"', f'src="{asset_data_uri("logo.png")}"')
    html = html.replace('src="jaws_logo.png"', f'src="{asset_data_uri("jaws_logo.png")}"')
    html = html.replace(
        'src="assets/jaws_login_logo.png"',
        f'src="{asset_data_uri("assets/jaws_login_logo.png")}"',
    )
    html = html.replace(
        'src="assets/airfast_logo_cropped.png"',
        f'src="{asset_data_uri("assets/airfast_logo_cropped.png")}"',
    )
    html = html.replace(
        'src="assets/airfast_auth_background_portrait.png"',
        f'src="{asset_data_uri("assets/airfast_auth_background_portrait.png")}"',
    )
    html = html.replace(
        'src="assets/eye_closed.png"',
        f'src="{asset_data_uri("assets/eye_closed.png")}"',
    )
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
        f"<script>{app_script}</script>",
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
        f'background-image: linear-gradient(180deg, rgba(5, 25, 46, 0.02), rgba(5, 25, 46, 0.2)), '
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
            html,
            body {{
                overflow: hidden;
            }}

            #MainMenu, footer, header, [data-testid="stSidebar"] {{
                visibility: hidden;
                display: none;
            }}

            .stApp {{
                min-height: 100dvh;
                background: #05192E;
                color: #1E293B;
                font-family: Montserrat, "Helvetica Neue", Arial, sans-serif;
                overflow: hidden;
            }}

            [data-testid="stAppViewContainer"] {{
                background: transparent !important;
                overflow: hidden;
            }}

            [data-testid="stMain"] {{
                align-items: flex-start !important;
                justify-content: flex-start !important;
                min-height: 100dvh;
                background: transparent !important;
            }}

            [data-testid="stToolbar"] {{
                display: none;
            }}

            [data-testid="stMainBlockContainer"],
            .block-container {{
                width: clamp(340px, 32vw, 460px) !important;
                max-width: clamp(340px, 32vw, 460px) !important;
                min-width: clamp(340px, 32vw, 460px) !important;
                min-height: 100dvh;
                margin: 0 !important;
                padding: clamp(96px, 11vh, 128px) clamp(24px, 2.7vw, 40px) clamp(68px, 8vh, 88px) !important;
                background: linear-gradient(180deg, #FFFFFF 0%, #F5F8FB 100%) !important;
                box-shadow: 18px 0 54px rgba(5, 25, 46, 0.24) !important;
                position: relative !important;
                z-index: 2 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
            }}

            [data-testid="stMainBlockContainer"]::before,
            .block-container::before {{
                content: "";
                position: fixed;
                top: 0;
                left: 0;
                width: clamp(340px, 32vw, 460px);
                height: 6px;
                background: #0C528A;
                z-index: 5;
            }}

            [data-testid="stVerticalBlock"] {{
                width: 100% !important;
                gap: 0.5rem !important;
            }}

            [data-testid="stMainBlockContainer"] > [data-testid="stVerticalBlock"] {{
                min-height: calc(100dvh - clamp(96px, 11vh, 128px) - clamp(68px, 8vh, 88px)) !important;
                justify-content: center !important;
            }}

            .login-background-panel {{
                position: fixed;
                inset: 0 0 0 clamp(340px, 32vw, 460px);
                z-index: 0;
                background-color: #6D9CD9;
                background-size: cover;
                background-position: center;
            }}

            .login-background-panel::after {{
                content: "";
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(180deg, rgba(5, 25, 46, 0.02) 0%, rgba(5, 25, 46, 0.2) 100%),
                    linear-gradient(90deg, rgba(5, 25, 46, 0.18) 0%, rgba(5, 25, 46, 0.0) 42%);
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
                position: fixed;
                top: clamp(14px, 2.4vh, 24px);
                left: min(calc(clamp(340px, 32vw, 460px) / 2), 50%);
                width: min(300px, 23vw);
                height: clamp(86px, 11vh, 118px);
                object-fit: cover;
                object-position: center;
                transform: translateX(-50%);
                z-index: 6;
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

            .login-heading {{
                margin: 0 0 12px;
                color: #05192E;
                font-size: clamp(1.75rem, 2.75vw, 2.35rem);
                line-height: 1.08;
                font-weight: 800;
                letter-spacing: 0;
            }}

            .login-copy {{
                max-width: 36rem;
                margin: 0 0 22px;
                color: #4D6988;
                font-size: 1rem;
                line-height: 1.55;
                font-weight: 500;
            }}

            div[data-testid="stForm"] {{
                width: 100% !important;
                border: 0 !important;
                padding: 0 !important;
                background: transparent !important;
            }}

            div[data-testid="stTextInput"] label {{
                color: #05192E;
                font-size: 0.8rem;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }}

            div[data-testid="stTextInputRootElement"] {{
                height: 42px;
                min-height: 42px;
                width: 100%;
                border: 1px solid rgba(77, 105, 136, 0.44);
                border-left: 4px solid #0C528A;
                border-radius: 4px;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
                color: #05192E;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 8px 18px rgba(5, 25, 46, 0.06);
                transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }}

            div[data-testid="stTextInputRootElement"]:focus-within {{
                border-color: #0C528A !important;
                border-left-color: #F9B515 !important;
                background: #FFFFFF !important;
                box-shadow: 0 0 0 3px rgba(12, 82, 138, 0.16), 0 12px 24px rgba(5, 25, 46, 0.1) !important;
            }}

            div[data-testid="stTextInput"] input {{
                height: 40px !important;
                border: 0 !important;
                background: transparent !important;
                color: #05192E !important;
                box-shadow: none !important;
                font-size: 0.98rem !important;
                font-weight: 600 !important;
                padding: 0 14px !important;
            }}

            div[data-testid="stTextInput"] input:focus {{
                box-shadow: none !important;
                outline: none !important;
            }}

            div[data-testid="stTextInputRootElement"] button {{
                height: 40px !important;
                width: 40px !important;
                border: 0 !important;
                border-left: 1px solid rgba(77, 105, 136, 0.18) !important;
                border-radius: 0 4px 4px 0 !important;
                background: #FFFFFF !important;
                color: #4D6988 !important;
            }}

            div[data-testid="stFormSubmitButton"] button {{
                height: 42px;
                margin-top: 2px;
                border: 0;
                border-radius: 4px;
                background: #0C528A;
                color: #FFFFFF;
                font-weight: 900;
                letter-spacing: 0.04em;
                box-shadow: 0 16px 26px rgba(12, 82, 138, 0.24);
            }}

            div[data-testid="stFormSubmitButton"] button:hover {{
                background: #05192E;
                color: #FFFFFF;
                border: 0;
            }}

            .login-partnership {{
                position: fixed;
                bottom: clamp(34px, 5vh, 48px);
                left: min(calc(clamp(340px, 32vw, 460px) / 2), 50%);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: calc(clamp(340px, 32vw, 460px) - clamp(48px, 5.4vw, 80px));
                color: #4D6988;
                font-size: 0.78rem;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                transform: translateX(-50%);
                z-index: 6;
            }}

            .login-partnership img {{
                width: min(178px, 48%);
                max-height: 34px;
                object-fit: contain;
            }}

            .login-version {{
                position: fixed;
                bottom: clamp(10px, 2vh, 16px);
                left: min(calc(clamp(340px, 32vw, 460px) / 2), 50%);
                margin: 0;
                color: rgba(77, 105, 136, 0.54);
                font-size: 0.72rem;
                font-weight: 600;
                letter-spacing: 0.02em;
                transform: translateX(-50%);
                z-index: 6;
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
                    min-width: 100% !important;
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
        {login_asset_markup(LOGIN_JAWS_LOGO, "JAWS logo", "login-logo-jaws")}
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

    st.markdown(
        f"""
        <div class="login-partnership" aria-label="In partnership with Airfast Indonesia">
            <span>in partnership with</span>
            {login_asset_markup(LOGIN_AIRFAST_LOGO, "Airfast Indonesia logo", "login-logo-airfast")}
        </div>
        <p class="login-version">Beta Version 1.1.0</p>
        """,
        unsafe_allow_html=True,
    )


def render_authenticated_styles() -> None:
    st.markdown(
        """
        <style>
            html,
            body {
                height: 100%;
                margin: 0;
                overflow: hidden;
                background: #F5F7FA;
            }

            #MainMenu,
            footer,
            header,
            [data-testid="stSidebar"],
            [data-testid="stToolbar"] {
                visibility: hidden;
                display: none;
            }

            .stApp,
            [data-testid="stAppViewContainer"],
            [data-testid="stMain"] {
                background: #F5F7FA !important;
                min-height: 100dvh !important;
                height: 100dvh !important;
                overflow: hidden !important;
            }

            [data-testid="stMain"] {
                display: block !important;
            }

            [data-testid="stMainBlockContainer"],
            .block-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                height: 100dvh !important;
                overflow: hidden !important;
            }

            [data-testid="stVerticalBlock"],
            [data-testid="stElementContainer"] {
                width: 100% !important;
                height: 100dvh !important;
                overflow: hidden !important;
            }

            iframe {
                display: block !important;
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100dvh !important;
                border: 0 !important;
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

    try:
        utilization_data, _ = load_utilization_data(None)
        basic_inspection_data, _ = load_basic_inspection_data(None)
    except Exception as exc:
        st.error(f"Workbook processing failed: {exc}")
        st.stop()

    st.iframe(
        build_dashboard_html(utilization_data, basic_inspection_data),
        width="stretch",
        height=1080,
    )


def main() -> None:
    render_main_app()


main()
