if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker enregistré', reg.scope))
            .catch(err => console.error('Erreur Service Worker', err));
    });
}
// === Démarrage Caméra Live ===
const camera = document.getElementById("camera");

if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            camera.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
}

// === Exemple simple de données ===
const labels = ["08h", "10h", "12h", "14h", "16h"];

function createChart(id, data) {
    new Chart(document.getElementById(id), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: "",
                data: data,
                borderWidth: 2,
            }]
        },
        options: { responsive: true }
    });
}

// === Création des graphiques ===
createChart("prChart", [80, 82, 78, 79, 77]);
createChart("tempChart", [35, 42, 48, 50, 47]);
createChart("prodChart", [120, 200, 350, 400, 380]);
createChart("irrChart", [300, 500, 780, 820, 790]);
createChart("historicChart", [100, 120, 150, 130, 160]);

// === Exemple d’état général ===
function updateEtat(perte) {
    const panel = document.getElementById("etat-general");

    if (perte < 10) {
        panel.className = "panel green";
        document.getElementById("etat-text").innerText = "Normal";
    } else if (perte < 25) {
        panel.className = "panel orange";
        document.getElementById("etat-text").innerText = "Attention";
    } else {
        panel.className = "panel red";
        document.getElementById("etat-text").innerText = "Critique";
    }
} // ===== OpenCV.js - Comparaison photo live vs base =====
cv['onRuntimeInitialized'] = () => {

    const diffCanvas = document.getElementById("diffCanvas");
    const diffCtx = diffCanvas.getContext("2d");

    let referenceImg = new Image();
    referenceImg.src = "images/panneau_ref.jpg"; // photo de référence
    referenceImg.onload = () => {
        const refMat = cv.imread(referenceImg);

        function compareLive() {
            let tempCanvas = document.createElement("canvas");
            tempCanvas.width = camera.videoWidth;
            tempCanvas.height = camera.videoHeight;
            tempCanvas.getContext("2d").drawImage(camera, 0, 0, tempCanvas.width, tempCanvas.height);

            let liveMat = cv.imread(tempCanvas);

            cv.resize(liveMat, liveMat, new cv.Size(refMat.cols, refMat.rows));

            let diffMat = new cv.Mat();
            cv.absdiff(refMat, liveMat, diffMat);
            cv.cvtColor(diffMat, diffMat, cv.COLOR_RGBA2GRAY);
            cv.threshold(diffMat, diffMat, 50, 255, cv.THRESH_BINARY);

            cv.imshow('diffCanvas', diffMat);

            let nonZero = cv.countNonZero(diffMat);
            let total = diffMat.rows * diffMat.cols;
            let diffPercent = ((nonZero / total) * 100).toFixed(1);
            document.getElementById("analyse-result").innerText = `Différence: ${diffPercent}%`;

            liveMat.delete();
            diffMat.delete();

            // Prédiction 48h
            predictLoss(parseFloat(diffPercent));
        }

        setInterval(compareLive, 5000);
    }
};

// ===== Régression linéaire simple pour prédiction =====
const historique = [
    { diff: 5, perte48h: 2 },
    { diff: 10, perte48h: 5 },
    { diff: 15, perte48h: 8 },
    { diff: 20, perte48h: 12 },
    { diff: 25, perte48h: 18 }
];

function trainLinearRegression(data) {
    let n = data.length;
    let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumX2 = 0;
    data.forEach(d => {
        sumX += d.diff;
        sumY += d.perte48h;
        sumXY += d.diff * d.perte48h;
        sumX2 += d.diff * d.diff;
    });
    let a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    let b = (sumY - a * sumX) / n;
    return { a, b };
}

const model = trainLinearRegression(historique);

function predictLoss(diffPercent) {
    let pertePredite = (model.a * diffPercent + model.b).toFixed(1);
    document.getElementById("prediction-value").innerText = `${pertePredite}%`;

    const panel = document.getElementById("prediction-value").parentElement;
    if (pertePredite < 10) panel.className = "panel green";
    else if (pertePredite < 25) panel.className = "panel orange";
    else panel.className = "panel red";
}