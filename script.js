const form = document.getElementById("freteForm");
const cepInput = document.getElementById("cep");

const loading = document.getElementById("loading");
const erro = document.getElementById("erro");
const resultado = document.getElementById("resultado");

const enderecoCompleto = document.getElementById("enderecoCompleto");
const cepResultado = document.getElementById("cepResultado");
const distanciaElemento = document.getElementById("distancia");
const uberElemento = document.getElementById("uber");
const freteElemento = document.getElementById("frete");

const origem = {
    latitude: -3.7746,
    longitude: -38.5704
};

const precoBase = 3.00;
const precoPorKm = 1.80;

cepInput.addEventListener("input", () => {
    let valor = cepInput.value.replace(/\D/g, "");

    if (valor.length > 5) {
        valor = valor.substring(0, 5) + "-" + valor.substring(5, 8);
    }

    cepInput.value = valor;
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cep = cepInput.value.replace(/\D/g, "");

    esconderResultado();
    erro.classList.add("hidden");

    if (cep.length !== 8) {
        mostrarErro("Digite um CEP válido com 8 números.");
        return;
    }

    loading.classList.remove("hidden");

    try {
        const respostaCep = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        if (!respostaCep.ok) {
            throw new Error("Erro ao consultar o CEP.");
        }

        const dadosCep = await respostaCep.json();

        if (dadosCep.erro) {
            throw new Error("CEP não encontrado.");
        }

        const endereco = [
            dadosCep.logradouro,
            dadosCep.bairro,
            dadosCep.localidade,
            dadosCep.uf,
            "Brasil"
        ]
            .filter(Boolean)
            .join(", ");

        const respostaGeo = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`
        );

        if (!respostaGeo.ok) {
            throw new Error("Não foi possível localizar o endereço.");
        }

        const dadosGeo = await respostaGeo.json();

        if (!dadosGeo.length) {
            throw new Error("Não foi possível encontrar a localização desse CEP.");
        }

        const destino = {
            latitude: Number(dadosGeo[0].lat),
            longitude: Number(dadosGeo[0].lon)
        };

        const distancia = await calcularDistanciaRota(origem, destino);

        const precoUber = calcularPreco(distancia);

        const valorFrete = precoUber;

        enderecoCompleto.textContent =
            `${dadosCep.logradouro || ""}, ${dadosCep.bairro || ""}, ${dadosCep.localidade || ""} - ${dadosCep.uf || ""}`;

        cepResultado.textContent = `CEP: ${dadosCep.cep}`;

        distanciaElemento.textContent =
            `${distancia.toFixed(2).replace(".", ",")} km`;

        uberElemento.textContent =
            formatarMoeda(precoUber);

        freteElemento.textContent =
            formatarMoeda(valorFrete);

        resultado.classList.remove("hidden");

    } catch (error) {
        mostrarErro(error.message);
    } finally {
        loading.classList.add("hidden");
    }
});

async function calcularDistanciaRota(origem, destino) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origem.longitude},${origem.latitude};` +
        `${destino.longitude},${destino.latitude}` +
        `?overview=false`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Não foi possível calcular a distância.");
    }

    const dados = await resposta.json();

    if (
        dados.code !== "Ok" ||
        !dados.routes ||
        !dados.routes.length
    ) {
        throw new Error("Não foi possível encontrar uma rota.");
    }

    return dados.routes[0].distance / 1000;
}

function calcularPreco(distancia) {
    return precoBase + (distancia * precoPorKm);
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function mostrarErro(mensagem) {
    erro.textContent = mensagem;
    erro.classList.remove("hidden");
}

function esconderResultado() {
    resultado.classList.add("hidden");
}