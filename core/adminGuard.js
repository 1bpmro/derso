export function canOpenAdmin() {
    const token = localStorage.getItem("adminToken");

    return Boolean(token && token.length > 10);
}

export function setAdminMode(value) {
    window.__ADMIN_MODE__ = value;
}
