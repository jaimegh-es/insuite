// Variables globales
let markdownInput, preview, fileInput, wordCount, statusMessage;
let conversionMode = 'md-to-docx'; // 'md-to-docx' o 'docx-to-md'
let currentFileName = '';
let convertedBlob = null;
let uploadedDocxFile = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('MDOCX Editor inicializando...');

    // Obtener elementos
    markdownInput = document.getElementById('markdown-input');
    preview = document.getElementById('preview');
    fileInput = document.getElementById('file-input');
    wordCount = document.getElementById('word-count');
    statusMessage = document.getElementById('status-message');

    // Botones
    const btnConvert = document.getElementById('btn-convert');
    const btnDownload = document.getElementById('btn-download');
    const btnToggleMode = document.getElementById('btn-toggle-mode');
    const btnClear = document.getElementById('btn-clear');

    if (markdownInput && preview) {
        console.log('Elementos encontrados, configurando eventos...');

        // Configurar eventos
        markdownInput.addEventListener('input', updatePreview);
        markdownInput.addEventListener('keyup', updatePreview);

        // Eventos de botones
        if (fileInput) fileInput.addEventListener('change', handleFileUpload);
        if (btnConvert) btnConvert.addEventListener('click', convertFile);
        if (btnDownload) btnDownload.addEventListener('click', downloadFile);
        if (btnToggleMode) btnToggleMode.addEventListener('click', toggleConversionMode);
        if (btnClear) btnClear.addEventListener('click', clearEditor);

        // Actualizar vista previa inicial
        updatePreview();
        console.log('MDOCX Editor inicializado correctamente');
    } else {
        console.error('No se encontraron los elementos necesarios');
    }
});

// Función para actualizar la vista previa
function updatePreview() {
    if (!markdownInput || !preview) return;

    const text = markdownInput.value;

    // Contar palabras
    if (wordCount) {
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        wordCount.textContent = words.length + ' palabras';
    }

    // Si no hay texto, mostrar placeholder
    if (!text.trim()) {
        preview.innerHTML = '';
        return;
    }

    try {
        // Convertir markdown a HTML
        const html = marked.parse(text);
        preview.innerHTML = html;
    } catch (error) {
        console.error('Error actualizando vista previa:', error);
        preview.innerHTML = '<div style="color: #e74c3c; padding: 20px;">Error renderizando el contenido.</div>';
    }
}

// Función para manejar la subida de archivos
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    currentFileName = file.name;
    const fileExtension = file.name.split('.').pop().toLowerCase();

    // Actualizar información del archivo de entrada
    const inputFileInfo = document.getElementById('input-file-info');
    if (inputFileInfo) {
        inputFileInfo.textContent = file.name;
    }

    if (fileExtension === 'docx') {
        // Es un archivo DOCX
        uploadedDocxFile = file;

        // Usar mammoth para extraer el contenido
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;

            mammoth.extractRawText({arrayBuffer: arrayBuffer})
                .then(function(result) {
                    markdownInput.value = result.value;
                    setStatus('Archivo DOCX cargado correctamente', 'success');

                    // Sugerir cambiar a modo DOCX → MD si no está ya
                    if (conversionMode !== 'docx-to-md') {
                        setStatus('Archivo DOCX detectado. Considera cambiar a modo DOCX → MD', 'info');
                    }

                    updatePreview();
                })
                .catch(function(err) {
                    setStatus('Error al leer el archivo DOCX: ' + err.message, 'error');
                    console.error(err);
                });
        };
        reader.readAsArrayBuffer(file);

    } else if (fileExtension === 'md') {
        // Es un archivo Markdown
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            markdownInput.value = content;
            setStatus('Archivo Markdown cargado correctamente', 'success');

            // Sugerir cambiar a modo MD → DOCX si no está ya
            if (conversionMode !== 'md-to-docx') {
                setStatus('Archivo MD detectado. Considera cambiar a modo MD → DOCX', 'info');
            }

            updatePreview();
        };
        reader.readAsText(file);

    } else {
        // Archivo no soportado
        const reader = new FileReader();
        reader.onload = function(e) {
            markdownInput.value = e.target.result;
            setStatus('Formato de archivo no reconocido. Se cargó como texto plano.', 'warning');
            updatePreview();
        };
        reader.readAsText(file);
    }
}

// Función para convertir el archivo
async function convertFile() {
    const content = markdownInput.value.trim();

    if (!content) {
        setStatus('No hay contenido para convertir', 'warning');
        return;
    }

    try {
        if (conversionMode === 'md-to-docx') {
            // Convertir MD a DOCX
            setStatus('Convirtiendo MD a DOCX...', 'info');
            convertedBlob = await mdToDocx(content);

            const outputFileInfo = document.getElementById('output-file-info');
            if (outputFileInfo) {
                const newName = currentFileName ? currentFileName.replace(/\.md$/i, '.docx') : 'documento.docx';
                outputFileInfo.textContent = newName;
            }
            setStatus('Conversión MD → DOCX completada', 'success');

        } else {
            // Convertir DOCX a MD
            if (!uploadedDocxFile) {
                setStatus('Por favor, sube un archivo DOCX primero', 'warning');
                return;
            }

            setStatus('Convirtiendo DOCX a MD...', 'info');
            convertedBlob = await docxToMd(uploadedDocxFile);

            const outputFileInfo = document.getElementById('output-file-info');
            if (outputFileInfo) {
                const newName = currentFileName ? currentFileName.replace(/\.docx$/i, '.md') : 'documento.md';
                outputFileInfo.textContent = newName;
            }
            setStatus('Conversión DOCX → MD completada', 'success');
        }

        // Habilitar botón de descarga
        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) {
            btnDownload.disabled = false;
        }

    } catch (error) {
        setStatus('Error durante la conversión: ' + error.message, 'error');
        console.error('Error de conversión:', error);
    }
}

// Función para convertir MD a DOCX creando el XML manualmente
async function mdToDocx(mdContent) {
    // Resetear hyperlinks
    hyperlinkRels = [];
    hyperlinkCounter = 3; // rId1=styles, rId2=numbering, rId3+ para hyperlinks

    // Convertir markdown a HTML
    const htmlContent = marked.parse(mdContent);

    // Extraer título
    let title = 'Documento';
    const h1Match = mdContent.match(/^#\s+(.+)$/m);
    if (h1Match) {
        title = h1Match[1].trim();
    }

    // Crear un div temporal para parsear el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Convertir HTML a XML de Word
    let bodyXml = '';

    Array.from(tempDiv.children).forEach(element => {
        bodyXml += htmlElementToWordXml(element);
    });

    // Crear documento DOCX completo
    const docXml = createWordDocument(title, bodyXml);

    // Crear archivo ZIP (DOCX es un ZIP)
    const zip = new PizZip();

    // Agregar archivos requeridos
    zip.file('[Content_Types].xml', createContentTypes());
    zip.file('_rels/.rels', createRels());
    zip.file('word/_rels/document.xml.rels', createDocumentRels());
    zip.file('word/document.xml', docXml);
    zip.file('word/styles.xml', createStyles());
    zip.file('word/numbering.xml', createNumbering());

    // Generar blob
    const blob = zip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    return blob;
}

// Convertir elemento HTML a XML de Word
function htmlElementToWordXml(element) {
    const tagName = element.tagName.toLowerCase();
    let xml = '';

    switch(tagName) {
        case 'h1':
            xml = processInlineElements(element, 'Heading1');
            break;
        case 'h2':
            xml = processInlineElements(element, 'Heading2');
            break;
        case 'h3':
            xml = processInlineElements(element, 'Heading3');
            break;
        case 'p':
            xml = processInlineElements(element, null);
            break;
        case 'ul':
            Array.from(element.children).forEach(li => {
                const checkbox = li.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    // Es una checklist
                    const isChecked = checkbox.checked;
                    const numId = isChecked ? 4 : 3; // numId 3 para unchecked, 4 para checked
                    xml += processListItem(li, numId);
                } else {
                    // Lista normal con viñetas
                    xml += processListItem(li, 1); // numId 1 para bullets
                }
            });
            break;
        case 'ol':
            Array.from(element.children).forEach(li => {
                xml += processListItem(li, 2); // numId 2 para listas numeradas
            });
            break;
        case 'pre':
            const codeElement = element.querySelector('code');
            const codeText = codeElement ? codeElement.textContent : element.textContent;
            xml = `<w:p><w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(codeText)}</w:t></w:r></w:p>`;
            break;
        case 'blockquote':
            // Procesar cada párrafo dentro del blockquote
            Array.from(element.children).forEach(child => {
                if (child.tagName === 'P') {
                    xml += processInlineElements(child, 'Quote');
                } else {
                    xml += `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr><w:r><w:t>${escapeXml(child.textContent)}</w:t></w:r></w:p>`;
                }
            });
            if (element.children.length === 0) {
                xml = `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr><w:r><w:t>${escapeXml(element.textContent)}</w:t></w:r></w:p>`;
            }
            break;
        case 'hr':
            xml = `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="E0E0E0"/></w:pBdr></w:pPr></w:p>`;
            break;
        default:
            if (element.textContent.trim()) {
                xml = processInlineElements(element, null);
            }
    }

    return xml;
}

// Procesar elementos de lista
function processListItem(li, numId) {
    // Eliminar checkbox si existe (ya se procesó)
    const liClone = li.cloneNode(true);
    const checkbox = liClone.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.remove();
    }

    let xml = '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + numId + '"/></w:numPr></w:pPr>';

    // Procesar contenido inline
    liClone.childNodes.forEach(node => {
        xml += processNode(node);
    });

    xml += '</w:p>';
    return xml;
}

// Procesar elementos inline (negrita, cursiva, código, enlaces, etc.)
function processInlineElements(element, styleId) {
    let xml = '<w:p>';

    if (styleId) {
        xml += '<w:pPr><w:pStyle w:val="' + styleId + '"/></w:pPr>';
    }

    element.childNodes.forEach(node => {
        xml += processNode(node);
    });

    xml += '</w:p>';
    return xml;
}

// Procesar un nodo individual
function processNode(node) {
    let xml = '';

    if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim() || node.textContent.includes(' ')) {
            xml += `<w:r><w:t xml:space="preserve">${escapeXml(node.textContent)}</w:t></w:r>`;
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        switch(tagName) {
            case 'strong':
            case 'b':
                xml += `<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(node.textContent)}</w:t></w:r>`;
                break;
            case 'em':
            case 'i':
                xml += `<w:r><w:rPr><w:i/></w:rPr><w:t>${escapeXml(node.textContent)}</w:t></w:r>`;
                break;
            case 'code':
                xml += `<w:r><w:rPr><w:rStyle w:val="Code"/></w:rPr><w:t xml:space="preserve">${escapeXml(node.textContent)}</w:t></w:r>`;
                break;
            case 'a':
                // Crear hyperlink real
                const href = node.getAttribute('href');
                const linkText = node.textContent;
                const rId = 'rId' + hyperlinkCounter++;

                // Agregar relación
                hyperlinkRels.push({
                    id: rId,
                    url: escapeXml(href)
                });

                // Crear hyperlink en el documento
                xml += `<w:hyperlink r:id="${rId}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:color w:val="3533CD"/><w:u w:val="single"/></w:rPr><w:t>${escapeXml(linkText)}</w:t></w:r></w:hyperlink>`;
                break;
            case 'br':
                xml += '<w:r><w:br/></w:r>';
                break;
            default:
                // Procesar hijos del nodo
                node.childNodes.forEach(child => {
                    xml += processNode(child);
                });
                break;
        }
    }

    return xml;
}

// Escapar caracteres XML
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Crear documento Word XML
function createWordDocument(title, bodyXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;
}

// Crear Content Types
function createContentTypes() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
}

// Crear Rels
function createRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

// Variable global para almacenar hyperlinks
let hyperlinkRels = [];
let hyperlinkCounter = 2;

// Crear Document Rels
function createDocumentRels() {
    let rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`;

    // Agregar hyperlinks
    hyperlinkRels.forEach(rel => {
        rels += `\n  <Relationship Id="${rel.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${rel.url}" TargetMode="External"/>`;
    });

    rels += `\n</Relationships>`;
    return rels;
}

// Crear Numbering XML para listas
function createNumbering() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">

  <!-- Abstract numbering para lista sin orden (bullets) -->
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
      <w:rPr>
        <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/>
      </w:rPr>
    </w:lvl>
  </w:abstractNum>

  <!-- Abstract numbering para lista ordenada -->
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>

  <!-- Abstract numbering para checklist -->
  <w:abstractNum w:abstractNumId="2">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="☐"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
      <w:rPr>
        <w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:hint="default"/>
      </w:rPr>
    </w:lvl>
  </w:abstractNum>

  <!-- Abstract numbering para checklist marcado -->
  <w:abstractNum w:abstractNumId="3">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="☑"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
      <w:rPr>
        <w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:hint="default"/>
      </w:rPr>
    </w:lvl>
  </w:abstractNum>

  <!-- Num para lista sin orden -->
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>

  <!-- Num para lista ordenada -->
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
  </w:num>

  <!-- Num para checklist -->
  <w:num w:numId="3">
    <w:abstractNumId w:val="2"/>
  </w:num>

  <!-- Num para checklist marcado -->
  <w:num w:numId="4">
    <w:abstractNumId w:val="3"/>
  </w:num>

</w:numbering>`;
}

// Crear Styles XML con colores personalizados
function createStyles() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

  <!-- Estilo Normal -->
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
      <w:color w:val="000000"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
    </w:pPr>
  </w:style>

  <!-- Estilo Heading 1 -->
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="48"/>
      <w:szCs w:val="48"/>
      <w:color w:val="3533CD"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="24" w:space="1" w:color="00F7FF"/>
      </w:pBdr>
    </w:pPr>
  </w:style>

  <!-- Estilo Heading 2 -->
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
      <w:color w:val="3533CD"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:before="200" w:after="100"/>
    </w:pPr>
  </w:style>

  <!-- Estilo Heading 3 -->
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
      <w:color w:val="3533CD"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:before="160" w:after="80"/>
    </w:pPr>
  </w:style>

  <!-- Estilo Code -->
  <w:style w:type="character" w:styleId="Code">
    <w:name w:val="Code"/>
    <w:rPr>
      <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
      <w:color w:val="3533CD"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F4F4F4"/>
    </w:rPr>
  </w:style>

  <!-- Estilo Quote -->
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:i/>
      <w:color w:val="666666"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:before="160" w:after="160"/>
      <w:ind w:left="360"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="24" w:space="4" w:color="3533CD"/>
      </w:pBdr>
    </w:pPr>
  </w:style>

  <!-- Estilo CodeBlock -->
  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
      <w:color w:val="F8F8F8"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:before="160" w:after="160"/>
      <w:shd w:val="clear" w:color="auto" w:fill="2D2D2D"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="24" w:space="4" w:color="00F7FF"/>
      </w:pBdr>
    </w:pPr>
  </w:style>

  <!-- Estilo Hyperlink -->
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
      <w:color w:val="3533CD"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>

</w:styles>`;
}

// Función para convertir DOCX a MD usando mammoth
async function docxToMd(file) {
    const arrayBuffer = await file.arrayBuffer();

    // Convertir a HTML primero
    const result = await mammoth.convertToHtml({arrayBuffer: arrayBuffer});
    const html = result.value;

    // Convertir HTML a Markdown
    let markdown = html
        // Títulos
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
        // Negrita
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        // Cursiva
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        // Listas
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ul[^>]*>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<ol[^>]*>/gi, '\n')
        // Párrafos
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        // Enlaces
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        // Código
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        // Línea horizontal
        .replace(/<hr[^>]*>/gi, '\n---\n\n')
        // Limpiar tags restantes
        .replace(/<[^>]+>/g, '')
        // Decodificar entidades HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        // Limpiar espacios múltiples
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Crear blob con el markdown
    const blob = new Blob([markdown], { type: 'text/markdown' });

    // Actualizar el editor con el markdown convertido
    markdownInput.value = markdown;
    updatePreview();

    return blob;
}

// Función para descargar el archivo convertido
function downloadFile() {
    if (!convertedBlob) {
        setStatus('No hay contenido convertido para descargar', 'warning');
        return;
    }

    let filename;

    if (conversionMode === 'md-to-docx') {
        filename = currentFileName ? currentFileName.replace(/\.md$/i, '.docx') : 'documento.docx';
    } else {
        filename = currentFileName ? currentFileName.replace(/\.docx$/i, '.md') : 'documento.md';
    }

    // Usar método nativo del navegador para descargar
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus('Archivo descargado: ' + filename, 'success');
}

// Función para alternar el modo de conversión
function toggleConversionMode() {
    conversionMode = conversionMode === 'md-to-docx' ? 'docx-to-md' : 'md-to-docx';

    // Actualizar UI
    const conversionModeEl = document.getElementById('conversion-mode');
    const btnToggleMode = document.getElementById('btn-toggle-mode');

    if (conversionMode === 'md-to-docx') {
        if (conversionModeEl) conversionModeEl.textContent = 'MD → DOCX';
        if (btnToggleMode) btnToggleMode.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i>Cambiar a DOCX → MD';
        setStatus('Modo cambiado a MD → DOCX', 'info');
    } else {
        if (conversionModeEl) conversionModeEl.textContent = 'DOCX → MD';
        if (btnToggleMode) btnToggleMode.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i>Cambiar a MD → DOCX';
        setStatus('Modo cambiado a DOCX → MD', 'info');
    }

    // Resetear contenido convertido
    convertedBlob = null;
    const btnDownload = document.getElementById('btn-download');
    if (btnDownload) {
        btnDownload.disabled = true;
    }
    const outputFileInfo = document.getElementById('output-file-info');
    if (outputFileInfo) {
        outputFileInfo.textContent = '';
    }
}

// Función para limpiar el editor
function clearEditor() {
    if (!markdownInput) return;

    const hasContent = markdownInput.value.trim().length > 0;

    if (!hasContent || confirm('¿Seguro que quieres borrar todo el contenido?')) {
        markdownInput.value = '';
        currentFileName = '';
        convertedBlob = null;
        uploadedDocxFile = null;

        // Resetear información de archivos
        const inputFileInfo = document.getElementById('input-file-info');
        const outputFileInfo = document.getElementById('output-file-info');
        if (inputFileInfo) inputFileInfo.textContent = '';
        if (outputFileInfo) outputFileInfo.textContent = '';

        // Deshabilitar botón de descarga
        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) btnDownload.disabled = true;

        // Resetear input de archivo
        if (fileInput) fileInput.value = '';

        updatePreview();
        setStatus('Editor limpiado', 'info');
    }
}

// Función para establecer mensaje de estado
function setStatus(message, type = 'info') {
    if (!statusMessage) return;

    statusMessage.textContent = message;

    // Cambiar color según tipo
    switch (type) {
        case 'success':
            statusMessage.style.color = '#4CAF50';
            break;
        case 'error':
            statusMessage.style.color = '#e74c3c';
            break;
        case 'warning':
            statusMessage.style.color = '#ff9800';
            break;
        case 'info':
        default:
            statusMessage.style.color = '#3533cd';
            break;
    }

    // Auto-limpiar después de 5 segundos si no es error
    if (type !== 'error') {
        setTimeout(() => {
            if (statusMessage && statusMessage.textContent === message) {
                statusMessage.textContent = 'Listo';
                statusMessage.style.color = '#3533cd';
            }
        }, 5000);
    }
}

// Atajos de teclado
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        downloadFile();
    }
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        convertFile();
    }
    if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleConversionMode();
    }
});
