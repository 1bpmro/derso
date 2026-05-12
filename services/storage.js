// services/storage.js

const STORAGE_KEY = "dersoDraft";

/* ======================================
   💾 SALVAR RASCUNHO
====================================== */

export function salvarRascunho(dados = {}) {

    try {

        // 🔥 evita salvar valores inválidos
        if (
            !dados ||
            typeof dados !== "object"
        ) {
            return;
        }

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(dados)
        );

    } catch (error) {

        console.warn(
            "⚠️ Falha ao salvar rascunho:",
            error
        );
    }
}

/* ======================================
   📥 RESTAURAR RASCUNHO
====================================== */

export function restaurarRascunho() {

    try {

        const draft =
            localStorage.getItem(STORAGE_KEY);

        if (!draft) {
            return null;
        }

        const parsed = JSON.parse(draft);

        // 🔥 valida estrutura mínima
        if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) {

            throw new Error(
                "Estrutura inválida"
            );
        }

        return parsed;

    } catch (error) {

        console.warn(
            "⚠️ Rascunho corrompido. Limpando armazenamento.",
            error
        );

        localStorage.removeItem(STORAGE_KEY);

        return null;
    }
}

/* ======================================
   🗑️ LIMPAR RASCUNHO
====================================== */

export function limparRascunho() {

    try {

        localStorage.removeItem(STORAGE_KEY);

    } catch (error) {

        console.warn(
            "⚠️ Falha ao limpar rascunho:",
            error
        );
    }
}
