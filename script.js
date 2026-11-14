const formulario = document.getElementById("form-transacao");
const descricao = document.getElementById("descricao");
const valor = document.getElementById("valor");
const botaoSalvar = document.getElementById("botao-salvar");
const botaoCancelarEdicao = document.getElementById("botao-cancelar-edicao");
let idTransacaoEmEdicao = null;
const opcoesTipo = document.querySelectorAll('input[name="tipo"]');
const containerCategorias = document.getElementById("opcoes-categoria");
const data = document.getElementById("data");
const totalReceitas = document.getElementById("total-receitas");
const totalDespesas = document.getElementById("total-despesas");
const saldoTotal = document.getElementById("saldo-total");
const listaTransacoes = document.getElementById("lista-transacoes");
const filtroMes = document.getElementById("filtro-mes");
const botaoLimparFiltro = document.getElementById("limpar-filtro");
const buscaTransacoes = document.getElementById("busca-transacoes");
const botaoExportarCsv = document.getElementById("exportar-csv");
const botaoAlternarTema = document.getElementById("alternar-tema");

const categoriasPorTipo = {
    receita: [
        "Salário",
        "Freelance",
        "Investimentos",
        "Vendas",
        "Outros"
    ],

    despesa: [
        "Alimentação",
        "Moradia",
        "Transporte",
        "Saúde",
        "Educação",
        "Lazer",
        "Contas",
        "Outros"
    ]
};

filtroMes.addEventListener("change", function () {
    atualizarHistorico();
    atualizarResumo();
});

buscaTransacoes.addEventListener("input", atualizarHistorico);

opcoesTipo.forEach(function (opcao) {
    opcao.addEventListener("change", atualizarCategorias);
});

botaoLimparFiltro.addEventListener("click", function () {
    filtroMes.value = "";
    buscaTransacoes.value = "";
    atualizarHistorico();
    atualizarResumo();
});

botaoExportarCsv.addEventListener("click", exportarTransacoesCsv);

function aplicarTema(tema) {
    const temaEscuro = tema === "escuro";
    document.body.classList.toggle("tema-escuro", temaEscuro);
    botaoAlternarTema.setAttribute("aria-pressed", String(temaEscuro));
    botaoAlternarTema.setAttribute(
        "aria-label",
        temaEscuro ? "Ativar modo claro" : "Ativar modo escuro"
    );
    botaoAlternarTema.querySelector(".texto-tema").textContent = temaEscuro
        ? "Modo claro"
        : "Modo escuro";
    botaoAlternarTema.querySelector("[aria-hidden]").textContent = temaEscuro
        ? "☀️"
        : "🌙";
    if (typeof graficoFinanceiro !== "undefined") {
        graficoFinanceiro.options.scales.y.ticks.color = temaEscuro ? "#cbd5e1" : "#475569";
        graficoFinanceiro.options.scales.y.grid.color = temaEscuro ? "#334155" : "#e2e8f0";
        graficoFinanceiro.update();
    }
}

function alternarTema() {
    const temaAtual = document.body.classList.contains("tema-escuro")
        ? "escuro"
        : "claro";
    const novoTema = temaAtual === "escuro" ? "claro" : "escuro";
    aplicarTema(novoTema);
    localStorage.setItem("tema", novoTema);
}

botaoAlternarTema.addEventListener("click", alternarTema);

let transacoes = [];

function preencherDataHoje() {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    data.value = `${ano}-${mes}-${dia}`;
}

formulario.addEventListener("submit", function (event) {
    event.preventDefault();

    const transacao = {
        id: idTransacaoEmEdicao !== null
            ? idTransacaoEmEdicao
            : Date.now(),

        descricao: descricao.value.trim(),
        valor: Number(valor.value),
        tipo: document.querySelector('input[name="tipo"]:checked').value,
        categoria: document.querySelector('input[name="categoria"]:checked').value,
        data: data.value
    };

    if (
        transacao.descricao === "" ||
        !Number.isFinite(transacao.valor) ||
        transacao.valor <= 0
    ) {
        alert("Preencha os campos corretamente.");
        return;
    }

    if (idTransacaoEmEdicao !== null) {
        transacoes = transacoes.map(function (item) {
            if (item.id === idTransacaoEmEdicao) {
                return transacao;
            }

            return item;
        });
    } else {
        transacoes.push(transacao);
    }

    salvarTransacoes();

    formulario.reset();

    idTransacaoEmEdicao = null;
    botaoSalvar.textContent = "Adicionar transação";
    botaoCancelarEdicao.hidden = true;

    preencherDataHoje();
    atualizarCategorias();
    atualizarSistema();
});

function calcularReceitas() {

    return transacoes
        .filter(transacao => transacao.tipo === "receita")
        .reduce((total, transacao) => total + transacao.valor, 0);

}

function calcularDespesas() {

    return transacoes
        .filter(transacao => transacao.tipo === "despesa")
        .reduce((total, transacao) => total + transacao.valor, 0);

}

function calcularSaldo() {

    return calcularReceitas() - calcularDespesas();

}

function formatarMoeda(valor) {

    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

}

const elementoGrafico = document.getElementById("grafico-financeiro");

const graficoFinanceiro = new Chart(elementoGrafico, {
    type: "bar",

    data: {
        labels: ["Receitas", "Despesas"],

        datasets: [{
            label: "Valor em reais",

            data: [0, 0],

            backgroundColor: [
                "#15976b",
                "#dc4c64"
            ],

            borderRadius: 6
        }]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: "#475569" },
                grid: { color: "#e2e8f0" }
            }
        },

        plugins: {
            legend: {
                display: false
            }
        }
    }
});

const temaSalvo = localStorage.getItem("tema");
const temaInicial = temaSalvo || (
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro"
);
aplicarTema(temaInicial);

function atualizarResumo() {
    const mesSelecionado = filtroMes.value;

    const transacoesFiltradas = mesSelecionado
        ? transacoes.filter(function (transacao) {
            return transacao.data &&
                transacao.data.startsWith(mesSelecionado);
        })
        : transacoes;

    const receitas = transacoesFiltradas
        .filter(transacao => transacao.tipo === "receita")
        .reduce((total, transacao) => total + transacao.valor, 0);

    const despesas = transacoesFiltradas
        .filter(transacao => transacao.tipo === "despesa")
        .reduce((total, transacao) => total + transacao.valor, 0);

    const saldo = receitas - despesas;

    totalReceitas.textContent = formatarMoeda(receitas);
    totalDespesas.textContent = formatarMoeda(despesas);
    saldoTotal.textContent = formatarMoeda(saldo);

    graficoFinanceiro.data.datasets[0].data = [
        receitas,
        despesas
    ];

    graficoFinanceiro.update();
}

function atualizarHistorico() {
    listaTransacoes.replaceChildren();

    const mesSelecionado = filtroMes.value;

    const termoBusca = buscaTransacoes.value.trim().toLocaleLowerCase("pt-BR");

    const transacoesFiltradas = mesSelecionado
        ? transacoes.filter(function (transacao) {
            return transacao.data &&
                transacao.data.startsWith(mesSelecionado);
        })
        : transacoes;

    const resultados = transacoesFiltradas.filter(function (transacao) {
        const texto = `${transacao.descricao} ${transacao.categoria}`.toLocaleLowerCase("pt-BR");
        return texto.includes(termoBusca);
    });

    if (resultados.length === 0) {
        const mensagem = document.createElement("li");
        mensagem.className = "mensagem-vazia";
        mensagem.textContent = transacoes.length === 0
            ? "Nenhuma movimentação cadastrada."
            : "Nenhuma movimentação corresponde aos filtros.";

        listaTransacoes.appendChild(mensagem);
        return;
    }

    [...resultados]
        .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
        .forEach(function (transacao) {
            const item = document.createElement("li");

            const nome = document.createElement("span");

            const dataFormatada = transacao.data
                ? transacao.data.split("-").reverse().join("/")
                : "";

            nome.textContent =
                `${transacao.descricao} (${transacao.categoria}) - ${dataFormatada}`;

            const valorTransacao = document.createElement("strong");
            valorTransacao.textContent = formatarMoeda(transacao.valor);

            if (transacao.tipo === "receita") {
                valorTransacao.style.color = "#15976b";
            } else {
                valorTransacao.style.color = "#dc4c64";
            }

            const botaoEditar = document.createElement("button");
            botaoEditar.textContent = "Editar";
            botaoEditar.type = "button";
            botaoEditar.className = "botao-editar";

            botaoEditar.addEventListener("click", function () {
                editarTransacao(transacao.id);
            });

            const botaoExcluir = document.createElement("button");
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.type = "button";
            botaoExcluir.className = "botao-excluir";

            botaoExcluir.addEventListener("click", function () {
                excluirTransacao(transacao.id);
            });

            item.append(nome, valorTransacao, botaoEditar, botaoExcluir);

            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";
            item.style.gap = "12px";
            item.style.flexWrap = "wrap";

            listaTransacoes.appendChild(item);
        });
}

function exportarTransacoesCsv() {
    const mesSelecionado = filtroMes.value;
    const termoBusca = buscaTransacoes.value.trim().toLocaleLowerCase("pt-BR");
    const resultados = transacoes.filter(function (transacao) {
        const correspondeAoMes = !mesSelecionado || transacao.data.startsWith(mesSelecionado);
        const texto = `${transacao.descricao} ${transacao.categoria}`.toLocaleLowerCase("pt-BR");
        return correspondeAoMes && texto.includes(termoBusca);
    });

    if (resultados.length === 0) {
        alert("Não há movimentações para exportar com os filtros atuais.");
        return;
    }

    const escaparCampo = valor => `"${String(valor ?? "").replaceAll('"', '""')}"`;
    const linhas = [
        ["Data", "Descrição", "Tipo", "Categoria", "Valor (R$)"],
        ...resultados.map(transacao => [
            transacao.data,
            transacao.descricao,
            transacao.tipo === "receita" ? "Receita" : "Despesa",
            transacao.categoria,
            transacao.valor.toFixed(2).replace(".", ",")
        ])
    ];
    const conteudo = "\uFEFF" + linhas
        .map(linha => linha.map(escaparCampo).join(";"))
        .join("\r\n");
    const arquivo = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimentacoes${mesSelecionado ? `-${mesSelecionado}` : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function editarTransacao(id) {
    const transacao = transacoes.find(function (item) {
        return item.id === id;
    });

    if (!transacao) {
        return;
    }

    idTransacaoEmEdicao = id;

    descricao.value = transacao.descricao;
    valor.value = transacao.valor;
    data.value = transacao.data;

    const tipoSelecionado = document.querySelector(
        `input[name="tipo"][value="${transacao.tipo}"]`
    );

    if (tipoSelecionado) {
        tipoSelecionado.checked = true;
    }

    atualizarCategorias();

    const categoriaSelecionada = document.querySelector(
        `input[name="categoria"][value="${transacao.categoria}"]`
    );

    if (categoriaSelecionada) {
        categoriaSelecionada.checked = true;
    }

    botaoSalvar.textContent = "Salvar alterações";
    botaoCancelarEdicao.hidden = false;

    formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function cancelarEdicao() {
    idTransacaoEmEdicao = null;

    formulario.reset();

    botaoSalvar.textContent = "Adicionar transação";
    botaoCancelarEdicao.hidden = true;

    atualizarCategorias();
}

botaoCancelarEdicao.addEventListener("click", cancelarEdicao);

function atualizarSistema() {

    atualizarResumo();

    atualizarHistorico();

}

function excluirTransacao(id) {
    transacoes = transacoes.filter(function (transacao) {
        return transacao.id !== id;
    });

    salvarTransacoes();

    atualizarSistema();
}

function salvarTransacoes() {
    localStorage.setItem(
        "transacoes",
        JSON.stringify(transacoes)
    );
}

function carregarTransacoes() {
    const dadosSalvos = localStorage.getItem("transacoes");

    if (dadosSalvos !== null) {
        try {
            const dados = JSON.parse(dadosSalvos);
            transacoes = Array.isArray(dados)
                ? dados.filter(function (item) {
                    return item &&
                        (typeof item.id === "number" || typeof item.id === "string") &&
                        typeof item.descricao === "string" &&
                        Number.isFinite(Number(item.valor)) &&
                        (item.tipo === "receita" || item.tipo === "despesa") &&
                        typeof item.data === "string";
                }).map(item => ({ ...item, valor: Number(item.valor) }))
                : [];
        } catch (erro) {
            transacoes = [];
        }
    }

    atualizarSistema();
}

function atualizarCategorias() {
    const tipoSelecionado = document.querySelector(
        'input[name="tipo"]:checked'
    ).value;

    const categoriasDisponiveis = categoriasPorTipo[tipoSelecionado];

    const categoriaAnterior = document.querySelector(
        'input[name="categoria"]:checked'
    )?.value;

    containerCategorias.replaceChildren();

    categoriasDisponiveis.forEach(function (categoria) {
        const label = document.createElement("label");
        label.className = "opcao-radio";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "categoria";
        input.value = categoria;

        const texto = document.createElement("span");
        texto.textContent = categoria;

        if (categoria === categoriaAnterior) {
            input.checked = true;
        }

        label.append(input, texto);
        containerCategorias.appendChild(label);
    });

    const categoriaAnteriorDisponivel = categoriasDisponiveis.includes(
        categoriaAnterior
    );

    if (!categoriaAnteriorDisponivel) {
        const primeiraOpcao = containerCategorias.querySelector(
            'input[name="categoria"]'
        );

        if (primeiraOpcao) {
            primeiraOpcao.checked = true;
        }
    }
}

atualizarCategorias();
preencherDataHoje();
carregarTransacoes();
