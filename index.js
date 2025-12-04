const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// Función para convertir imágenes a Base64
function imgToBase64(relativePath) {
    const filePath = path.join(__dirname, relativePath);
    const img = fs.readFileSync(filePath);
    return `data:image/png;base64,${img.toString("base64")}`;
}

// Cargar JSON de socios
const socios = require("./public/data/socios.json");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Ruta principal: renderiza el formulario con los socios
app.get("/", (req, res) => {
    res.render("form", { socios });
});

// Ruta POST para generar el PDF
app.post("/generar", async (req, res) => {
    const {
        socio,
        aporte_mensual,
        total_aportes,
        intereses,
        actividades,
        total_final
    } = req.body;

    // Buscar el nombre del socio seleccionado
    const socioSeleccionado = socios.find(s => s.ID == socio);
    const nombre = socioSeleccionado ? socioSeleccionado.Nombre : "Desconocido";

    const logo = imgToBase64("public/logo_new.png");
    const marca_agua = imgToBase64("public/logo_new.png");

    const htmlData = {
        nombre,
        aporte_mensual,
        total_aportes,
        intereses,
        actividades,
        total_final,
        logo,
        marca_agua
    };

    const filePath = path.join(__dirname, "pdfs", `${nombre}.pdf`);

    app.render("pdf", htmlData, async (err, html) => {
        if (err) return res.send("Error generando plantilla: " + err);

        try {
            // CONFIGURACIÓN ESPECIAL PARA RAILWAY
            const browser = await puppeteer.launch({
                headless: true,
                executablePath: puppeteer.executablePath(),
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--single-process",
                    "--no-zygote"
                ]
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });

            await page.pdf({
                path: filePath,
                format: "Letter",
                printBackground: true,
                margin: {
                    top: "15mm",
                    bottom: "15mm",
                    left: "15mm",
                    right: "15mm"
                }
            });

            await browser.close();

            res.download(filePath);

        } catch (error) {
            console.error("ERROR AL GENERAR PDF:", error);
            return res.send("Error generando PDF: " + error);
        }
    });
});

app.listen(3000, () =>
    console.log("Servidor en: http://localhost:3000")
);
