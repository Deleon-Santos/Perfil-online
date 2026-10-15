const THEME_STORAGE_KEY = "perfil-online-theme";
const THEME_COLORS = {
    light: "#f5f5f0",
    dark: "#202622"
};

const themeToggle = document.querySelector("#theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const mobileMenuQuery = window.matchMedia("(max-width: 680px)");
const menuToggle = document.querySelector(".menu-toggle");
const siteSidebar = document.querySelector("#site-sidebar");
const pageView = document.querySelector(".view");

function setMobileMenuOpen(isOpen) {
    siteSidebar.classList.toggle("is-open", isOpen);
    pageView.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen
        ? "Fechar menu de navegação"
        : "Abrir menu de navegação");
    menuToggle.querySelector("i").className = `fas ${isOpen ? "fa-xmark" : "fa-bars"}`;
}

menuToggle.addEventListener("click", () => {
    setMobileMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

document.addEventListener("click", (event) => {
    if (
        mobileMenuQuery.matches &&
        menuToggle.getAttribute("aria-expanded") === "true" &&
        !siteSidebar.contains(event.target) &&
        !menuToggle.contains(event.target)
    ) {
        setMobileMenuOpen(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMobileMenuOpen(false);
        menuToggle.focus();
    }
});

siteSidebar.querySelectorAll(".nav a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => setMobileMenuOpen(false));
});

mobileMenuQuery.addEventListener("change", (event) => {
    if (!event.matches) {
        setMobileMenuOpen(false);
    }
});

function readSavedTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
    } catch (error) {
        console.warn("Não foi possível ler o tema salvo no navegador.", error);
        return null;
    }
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.querySelector("i").className = `fas ${isDark ? "fa-sun" : "fa-moon"}`;
    themeToggle.querySelector("span").textContent = isDark
        ? "Ativar tema claro"
        : "Ativar tema escuro";
    themeColorMeta.setAttribute("content", THEME_COLORS[theme]);
}

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.warn("Não foi possível salvar a preferência de tema.", error);
    }
}

applyTheme(readSavedTheme() || (systemPrefersDark.matches ? "dark" : "light"));

themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveTheme(nextTheme);
});

const sectionLinks = [...document.querySelectorAll(".nav a[href^='#']")];
const contentScroller = document.querySelector(".page");
const sections = sectionLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

function updateActiveSection() {
    const marker = contentScroller.scrollTop + contentScroller.clientHeight * 0.20;
    let activeSection = sections[0];

    for (const section of sections) {
        if (section.offsetTop <= marker) {
            activeSection = section;
        } else {
            break;
        }
    }

    if (contentScroller.scrollTop + contentScroller.clientHeight >= contentScroller.scrollHeight - 2) {
        activeSection = sections[sections.length - 1];
    }

    for (const link of sectionLinks) {
        if (link.getAttribute("href") === `#${activeSection.id}`) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    }
}

let scrollUpdateScheduled = false;
contentScroller.addEventListener("scroll", () => {
    if (scrollUpdateScheduled) {
        return;
    }

    scrollUpdateScheduled = true;
    window.requestAnimationFrame(() => {
        updateActiveSection();
        scrollUpdateScheduled = false;
    });
}, { passive: true });
window.addEventListener("resize", updateActiveSection);
updateActiveSection();

function appendOptionalLink(item, listItem) {
    if (!item.url) {
        return;
    }

    const url = new URL(item.url, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new TypeError(`URL inválida para "${item.title}".`);
    }

    const link = document.createElement("a");
    link.href = url.href;
    link.textContent = item.linkText || "Saiba mais";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    listItem.append(" ", link);
}

function renderItems(listId, items, isExperience = false) {
    const list = document.getElementById(listId);
    if (!Array.isArray(items)) {
        throw new TypeError(`A propriedade de dados de "${listId}" deve ser uma lista.`);
    }

    const fragment = document.createDocumentFragment();
    for (const item of items) {
        if (
            !item ||
            typeof item.title !== "string" ||
            typeof item.description !== "string" ||
            (isExperience && typeof item.role !== "string")
        ) {
            throw new TypeError(`Há um item inválido na lista "${listId}".`);
        }

        const listItem = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = item.title;
        listItem.append(title);

        if (isExperience) {
            const role = document.createElement("span");
            role.textContent = ` — ${item.role}: `;
            listItem.append(role, document.createTextNode(item.description));
        } else {
            listItem.append(document.createTextNode(`: ${item.description}`));
        }

        appendOptionalLink(item, listItem);
        fragment.append(listItem);
    }

    list.replaceChildren(fragment);
}

function showDataError() {
    for (const listId of ["cursos", "experiencias", "lista-projetos"]) {
        const list = document.getElementById(listId);
        const message = document.createElement("li");
        message.setAttribute("role", "alert");
        message.textContent = "Não foi possível carregar estas informações. Tente novamente mais tarde.";
        list.replaceChildren(message);
    }
}

fetch("./data/portfolio.json")
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Falha ao carregar portfolio.json (HTTP ${response.status}).`);
        }
        return response.json();
    })
    .then((data) => {
        renderItems("cursos", data.cursos);
        renderItems("experiencias", data.experiencias, true);
        renderItems("lista-projetos", data.projetos);
    })
    .catch((error) => {
        console.error("Erro ao carregar os dados do portfólio.", error);
        showDataError();
    });
