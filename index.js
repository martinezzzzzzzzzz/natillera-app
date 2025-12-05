const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// Función para convertir imágenes a Base64, detectando tipo según extensión
function imgToBase64(relativePath) {
    const filePath = path.join(__dirname, relativePath);
    const img = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    return `data:image/${ext};base64,${img.toString("base64")}`;
}

// Cargar JSON de socios
const socios = require("./public/data/socios.json");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Ruta principal
app.get("/", (req, res) => {
    res.render("form", { socios });
});

// Ruta POST para generar PDF
app.post("/generar", async (req, res) => {
    const {
        socio,
        aporte_mensual,
        total_aportes,
        intereses,
        actividades,
        total_final
    } = req.body;

    const socioSeleccionado = socios.find(s => s.ID == socio);
    const nombre = socioSeleccionado ? socioSeleccionado.Nombre : "Desconocido";

    // Convertimos todas las imágenes a Base64
    const logo = imgToBase64("public/logo_new.png");
    const marca_agua = imgToBase64("public/logo_new.png");
    const firmaEnrique = imgToBase64("public/Firmas/Firma_enrique.png");
    const firmaMonica = imgToBase64("public/Firmas/Firma_monica.jpeg");

    const htmlData = {
        nombre,
        aporte_mensual,
        total_aportes,
        intereses,
        actividades,
        total_final,
        logo,
        marca_agua,
        firmaEnrique,
        firmaMonica
    };

    app.render("pdf", htmlData, async (err, html) => {
        if (err) return res.send("Error generando plantilla: " + err);

        try {
            // Configuración estable para Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                executablePath: puppeteer.executablePath(),
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote"
                ]
            });

            const page = await browser.newPage();

            await page.setContent(html, { waitUntil: "load" });

            const pdfBuffer = await page.pdf({
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

            // Mandamos el PDF directo sin guardarlo en disco
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombre}.pdf"`);
            return res.send(pdfBuffer);

        } catch (error) {
            console.error("ERROR AL GENERAR PDF:", error);
            return res.send("Error generando PDF: " + error);
        }
    });
});

app.listen(3000, () =>
    console.log("Servidor en: http://localhost:3000")
);
