class QuillScribeAI {
    constructor() {
        this.quill = null;
        this.chatEngine = null;
        this.lastResponse = '';
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        this.initializeQuill();
        this.setupEventListeners();
        await this.initializeWebLLM();
    }

    initializeQuill() {
        // Configuración de la toolbar de Quill
        const toolbarOptions = [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            ['blockquote', 'code-block'],
            ['link', 'image'],
            ['clean']
        ];

        this.quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: toolbarOptions
                }
            },
            placeholder: 'Comienza a escribir aquí con la ayuda de la IA. :)'
        });

        // Mover la toolbar al contenedor personalizado
        const toolbar = document.querySelector('.ql-toolbar');
        document.getElementById('toolbar').appendChild(toolbar);
    }

    setupEventListeners() {
        // Botones del toolbar principal
        document.getElementById('new-doc').addEventListener('click', () => this.newDocument());
        document.getElementById('open-doc').addEventListener('click', () => this.showOpenDialog());
        document.getElementById('save-doc').addEventListener('click', () => this.saveToLocalStorage());
        document.getElementById('export-pdf').addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-txt').addEventListener('click', () => this.exportToTXT());
        document.getElementById('toggle-chat').addEventListener('click', () => this.toggleChat());

        // Controles del chat
        document.getElementById('chat-close').addEventListener('click', () => this.closeChat());
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('insert-response').addEventListener('click', () => this.insertResponse());
        document.getElementById('copy-response').addEventListener('click', () => this.copyResponse());

        // Input del chat
        const chatInput = document.getElementById('chat-input');
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.newDocument();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveToLocalStorage();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.showOpenDialog();
                        break;
                    case 'e':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.exportToPDF();
                        }
                        break;
                }
            }
        });
    }

    async initializeWebLLM() {
        try {
            console.log('Inicializando WebLLM...');
            
            // Importar WebLLM dinámicamente
            const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');
            
            // Configurar el modelo (usando un modelo más pequeño para mejor rendimiento)
            const selectedModel = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
            
            this.updateChatStatus('Descargando modelo de IA...', true);
            
            // Crear el engine con callbacks de progreso
            this.chatEngine = await CreateMLCEngine(selectedModel, {
                initProgressCallback: (progress) => {
                    const percentage = Math.round(progress.progress * 100);
                    this.updateChatStatus(`Descargando modelo de IA: ${percentage}%`, true);
                }
            });

            console.log('WebLLM inicializado correctamente');
            this.updateChatStatus('¡IA lista para usar!', false);
            this.enableChatControls();
            
        } catch (error) {
            console.error('Error inicializando WebLLM:', error);
            this.updateChatStatus('Error al cargar la IA. Inténtalo más tarde.', false);
        }
    }

    updateChatStatus(message, showSpinner) {
        const statusEl = document.getElementById('chat-status');
        const spinner = statusEl.querySelector('.loading-spinner');
        const text = statusEl.querySelector('span');
        
        text.textContent = message;
        spinner.style.display = showSpinner ? 'block' : 'none';
        
        if (!showSpinner && message.includes('lista')) {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 2000);
        }
    }

    enableChatControls() {
        document.getElementById('chat-input').disabled = false;
        document.getElementById('send-message').disabled = false;
    }

    newDocument() {
        if (confirm('Revisa antes si has guardado los cambios por que al abrir un nuevo documento se perderán.')) {
            this.quill.setContents([]);
            this.quill.focus();
        }
    }

    saveToLocalStorage() {
        const title = prompt('Nombre del documento:', `Documento ${new Date().toLocaleString()}`);
        if (!title) return;

        const content = this.quill.getContents();
        const htmlContent = this.quill.root.innerHTML;
        
        const document = {
            id: Date.now().toString(),
            title: title,
            delta: content,
            html: htmlContent,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        // Obtener documentos existentes
        const savedDocs = JSON.parse(localStorage.getItem('quill-documents') || '[]');
        savedDocs.push(document);
        
        // Guardar en localStorage
        localStorage.setItem('quill-documents', JSON.stringify(savedDocs));
        
        alert(`Documento "${title}" guardado correctamente`);
    }

    showOpenDialog() {
        const savedDocs = JSON.parse(localStorage.getItem('quill-documents') || '[]');
        
        if (savedDocs.length === 0) {
            alert('No hay documentos guardados');
            return;
        }

        // Crear modal para mostrar documentos
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        let html = '<h3 style="margin-bottom: 20px;">Documentos Guardados</h3>';
        
        savedDocs.reverse().forEach(doc => {
            const date = new Date(doc.created).toLocaleString();
            html += `
                <div style="padding: 12px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 4px; cursor: pointer;" 
                     onmouseover="this.style.background='#f5f5f5'" 
                     onmouseout="this.style.background='white'"
                     onclick="window.quillApp.openDocument('${doc.id}')">
                    <strong>${doc.title}</strong><br>
                    <small style="color: #666;">Creado: ${date}</small>
                    <button onclick="event.stopPropagation(); window.quillApp.deleteDocument('${doc.id}')" 
                            style="float: right; background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                        Eliminar
                    </button>
                </div>
            `;
        });
        
        html += '<button onclick="this.closest(\'.modal\').remove()" style="margin-top: 20px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>';
        
        content.innerHTML = html;
        modal.className = 'modal';
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    openDocument(docId) {
        const savedDocs = JSON.parse(localStorage.getItem('quill-documents') || '[]');
        const doc = savedDocs.find(d => d.id === docId);
        
        if (doc) {
            this.quill.setContents(doc.delta);
            document.querySelector('.modal')?.remove();
            alert(`Documento "${doc.title}" abierto`);
        }
    }

    deleteDocument(docId) {
        if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
            const savedDocs = JSON.parse(localStorage.getItem('quill-documents') || '[]');
            const filteredDocs = savedDocs.filter(d => d.id !== docId);
            localStorage.setItem('quill-documents', JSON.stringify(filteredDocs));
            
            // Cerrar modal y volver a abrir para actualizar lista
            document.querySelector('.modal')?.remove();
            this.showOpenDialog();
        }
    }

    saveDocument() {
        // Método legacy - mantener por compatibilidad
        this.saveToLocalStorage();
    }

    async exportToPDF() {
        try {
            if (typeof html2pdf === 'undefined') {
                alert('Error: html2pdf no está cargado. Contacte con el administrador.');
                return;
            }
            const content = document.querySelector('.ql-editor').innerHTML;
            const opt = {
                margin: 1,
                filename: `documento_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            html2pdf().set(opt).from(content).save();
            if (typeof showToast === 'function') {
                showToast('PDF exportado exitosamente', 'success');
            } else {
                alert('PDF exportado exitosamente');
            }
        } catch (error) {
            console.error('Error exportando a PDF:', error);
            if (typeof showToast === 'function') {
                showToast('Error al exportar a PDF: ' + error.message, 'error');
            } else {
                alert('Error al exportar a PDF: ' + error.message);
            }
        }
    }

    exportToTXT() {
        const text = this.quill.getText();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `documento_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    toggleChat() {
        const chatPanel = document.getElementById('chat-panel');
        chatPanel.classList.toggle('open');
        
        if (chatPanel.classList.contains('open')) {
            document.getElementById('chat-input').focus();
        }
    }

    closeChat() {
        document.getElementById('chat-panel').classList.remove('open');
    }

    async sendMessage() {
        if (!this.chatEngine || this.isLoading) return;
        
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        // Obtener el texto actual del editor
        const editorText = this.quill.getText();

        this.isLoading = true;
        input.value = '';
        input.disabled = true;
        document.getElementById('send-message').disabled = true;
        
        // Agregar mensaje del usuario
        this.addMessage(message, 'user');
        
        // Mostrar indicador de "pensando"
        const thinkingEl = this.addThinkingIndicator();
        
        try {
            // Enviar mensaje a la IA con contexto del editor
            const response = await this.chatEngine.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Eres un asistente de escritura útil y amigable. Ayudas a los usuarios con sus documentos, proporcionas sugerencias de escritura, corriges gramática y respondes preguntas de manera clara y concisa. Responde siempre en español. Puedes usar Markdown para formatear tu respuesta (negrita **texto**, cursiva *texto*, listas, etc.). El usuario está trabajando en el siguiente texto:\n\n" + editorText
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 512
            });
            
            const aiResponse = response.choices[0].message.content;
            this.lastResponse = aiResponse;
            
            // Remover indicador de "pensando" y agregar respuesta
            thinkingEl.remove();
            this.addMessage(aiResponse, 'assistant');
            
            // Habilitar botones de acción
            document.getElementById('insert-response').disabled = false;
            document.getElementById('copy-response').disabled = false;
            
        } catch (error) {
            console.error('Error en chat:', error);
            thinkingEl.remove();
            this.addMessage('Lo siento, hubo un error al procesar tu mensaje. Inténtalo de nuevo.', 'assistant');
        }
        
        this.isLoading = false;
        input.disabled = false;
        document.getElementById('send-message').disabled = false;
        input.focus();
    }

    // Añade esta función utilitaria para convertir Markdown a HTML usando marked.js si está disponible
    markdownToHtml(markdown) {
        if (typeof marked !== 'undefined') {
            return marked.parse(markdown);
        }
        // Fallback simple para negrita y cursiva si marked no está disponible
        let html = markdown
            .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
            .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
            .replace(/\n/g, '<br>');
        return html;
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        if (sender === 'assistant') {
            messageEl.innerHTML = this.markdownToHtml(content);
        } else {
            messageEl.textContent = content;
        }
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageEl;
    }

    addThinkingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'chat-thinking';
        thinkingEl.innerHTML = `
            <span>Pensando</span>
            <div class="thinking-dots">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        `;
        
        messagesContainer.appendChild(thinkingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return thinkingEl;
    }

    insertResponse() {
        if (this.lastResponse) {
            const formattedContent = this.parseMarkdownToQuill(this.lastResponse);
            const selection = this.quill.getSelection();
            const index = selection ? selection.index : this.quill.getLength();
            
            // Insertar contenido formateado
            this.quill.insertText(index, '\n'); // Salto de línea antes
            const newIndex = index + 1;
            
            // Procesar y insertar el contenido formateado
            this.insertFormattedContent(formattedContent, newIndex);
        }
    }

    parseMarkdownToQuill(markdown) {
        // Convertir Markdown básico a formato Quill
        const lines = markdown.split('\n');
        const content = [];
        
        lines.forEach(line => {
            if (line.trim() === '') {
                content.push({ type: 'text', content: '\n' });
                return;
            }
            
            // Headers
            if (line.startsWith('### ')) {
                content.push({ type: 'header', level: 3, content: line.substring(4) });
            } else if (line.startsWith('## ')) {
                content.push({ type: 'header', level: 2, content: line.substring(3) });
            } else if (line.startsWith('# ')) {
                content.push({ type: 'header', level: 1, content: line.substring(2) });
            }
            // Listas
            else if (line.match(/^\d+\.\s/)) {
                content.push({ type: 'list', ordered: true, content: line.replace(/^\d+\.\s/, '') });
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                content.push({ type: 'list', ordered: false, content: line.substring(2) });
            }
            // Texto normal con formato inline
            else {
                content.push({ type: 'paragraph', content: line });
            }
        });
        
        return content;
    }

    insertFormattedContent(content, startIndex) {
        let currentIndex = startIndex;
        
        content.forEach(item => {
            switch (item.type) {
                case 'header':
                    this.quill.insertText(currentIndex, item.content + '\n');
                    this.quill.formatText(currentIndex, item.content.length, 'header', item.level);
                    currentIndex += item.content.length + 1;
                    break;
                    
                case 'list':
                    this.quill.insertText(currentIndex, item.content + '\n');
                    this.quill.formatLine(currentIndex, 1, 'list', item.ordered ? 'ordered' : 'bullet');
                    currentIndex += item.content.length + 1;
                    break;
                    
                case 'paragraph':
                    const formattedText = this.processInlineFormatting(item.content);
                    this.insertTextWithFormatting(formattedText, currentIndex);
                    currentIndex += item.content.length + 1;
                    this.quill.insertText(currentIndex - 1, '\n');
                    break;
                    
                case 'text':
                    this.quill.insertText(currentIndex, item.content);
                    currentIndex += item.content.length;
                    break;
            }
        });
        
        this.quill.setSelection(currentIndex);
    }

    processInlineFormatting(text) {
        const segments = [];
        let currentPos = 0;
        
        // Procesar negritas **texto**
        text.replace(/\*\*(.*?)\*\*/g, (match, content, offset) => {
            if (offset > currentPos) {
                segments.push({ text: text.substring(currentPos, offset), bold: false });
            }
            segments.push({ text: content, bold: true });
            currentPos = offset + match.length;
            return match;
        });
        
        // Agregar texto restante
        if (currentPos < text.length) {
            const remaining = text.substring(currentPos);
            // Procesar cursivas *texto*
            const italicSegments = [];
            let italicPos = 0;
            
            remaining.replace(/\*(.*?)\*/g, (match, content, offset) => {
                if (offset > italicPos) {
                    italicSegments.push({ text: remaining.substring(italicPos, offset), italic: false });
                }
                italicSegments.push({ text: content, italic: true });
                italicPos = offset + match.length;
                return match;
            });
            
            if (italicPos < remaining.length) {
                italicSegments.push({ text: remaining.substring(italicPos), italic: false });
            }
            
            segments.push(...italicSegments);
        }
        
        return segments.length > 0 ? segments : [{ text: text, bold: false, italic: false }];
    }

    insertTextWithFormatting(segments, startIndex) {
        let currentIndex = startIndex;
        
        segments.forEach(segment => {
            this.quill.insertText(currentIndex, segment.text);
            
            if (segment.bold) {
                this.quill.formatText(currentIndex, segment.text.length, 'bold', true);
            }
            if (segment.italic) {
                this.quill.formatText(currentIndex, segment.text.length, 'italic', true);
            }
            
            currentIndex += segment.text.length;
        });
    }

    async copyResponse() {
        if (this.lastResponse) {
            try {
                await navigator.clipboard.writeText(this.lastResponse);
                
                // Feedback visual
                const btn = document.getElementById('copy-response');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
                btn.style.background = '#28a745';
                btn.style.color = 'white';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
                
            } catch (error) {
                console.error('Error copiando:', error);
                alert('Error al copiar el texto');
            }
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.quillApp = new QuillScribeAI();
});
