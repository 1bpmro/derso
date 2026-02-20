export function salvarRascunho(dados) {
    try {
        localStorage.setItem("dersoDraft", JSON.stringify(dados));
    } catch (e) {
        console.warn("Falha ao salvar rascunho:", e);
    }
}

export function restaurarRascunho() {
    try {
        const draft = localStorage.getItem("dersoDraft");
        return draft ? JSON.parse(draft) : null;
    } catch (e) {
        console.warn("Rascunho corrompido. Limpando armazenamento.");
        localStorage.removeItem("dersoDraft");
        return null;
    }
}
