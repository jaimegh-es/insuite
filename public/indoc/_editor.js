class AIWritingAssistant {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.chatHistory = [];
    this.initializeQuill();
    this.initializeEventListeners();
    this.initializeAI();
  }

  initializeQuill() {
    const toolbarOptions = [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }, { 'header': 3 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image']
    ];

    this.quill = new Quill('#editor', {
      theme: 'snow',
      modules: {
        toolbar: toolbarOptions
      },
      placeholder: 'Comienza a escribir tu documento aquí...'
    });

    // Contenido inicial
    this.quill.setContents([
      { insert: 'Bienvenido a InDOC con IA\n', attributes: { header: 1, color: '#2c3e50' } },
      { insert: '\nEste es tu editor de texto enriquecido con asistente de IA integrado.\n\n' },
      { insert: 'Características disponibles:\n', attributes: { bold: true } },
      { insert: '• Asistente de IA para mejorar tu escritura\n' },
      { insert: '• Exportar a PDF con texto seleccionable\n' },
      { insert: '• Exportar a texto plano (.txt)\n' },
      { insert: '• Todas las herramientas de formato de texto\n\n' },
      { insert: '¡Haz clic en "AI Assistant" para comenzar a usar la IA!', attributes: { italic: true, color: '#7f8c8d' } }
    ]);
  }

  async initializeAI() {
    try {
      this.updateStatus('Inicializando IA...', 'loading');
      
      // Verificar si WebLLM está disponible
      if (typeof webllm === 'undefined') {
        this.updateStatus('WebLLM no disponible. Usando modo simulado.', 'error');
        this.isInitialized = true;
        return;
      }

      // Configuración para WebLLM
      const initProgressCallback = (report) => {
        this.updateStatus(`Cargando modelo: ${report.text}`, 'loading');
      };

      // Inicializar WebLLM con un modelo más pequeño y eficiente
      this.engine = new webllm.MLCEngine();
      
      // Usar un modelo más pequeño como TinyLlama o Phi-2
      const modelId = "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC";
      
      await this.engine.reload(modelId, {
        initProgressCallback: initProgressCallback
      });
      
      this.isInitialized = true;
      this.updateStatus('IA lista para usar', 'success');
      setTimeout(() => this.hideStatus(), 3000);
      
    } catch (error) {
      console.error('Error inicializando IA:', error);
      this.updateStatus('Error al cargar IA. Usando modo simulado.', 'error');
      this.isInitialized = true; // Permitir modo simulado
    }
  }

  initializeEventListeners() {
    // Eventos del editor
    document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportToPDF());
    document.getElementById('exportTextBtn').addEventListener('click', () => this.exportToText());
    
    // Eventos del chatbot
    document.getElementById('aiToggleBtn').addEventListener('click', () => this.toggleChatbot());
    document.getElementById('closeChatBtn').addEventListener('click', () => this.toggleChatbot());
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
    
    // Textarea events
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    chatInput.addEventListener('input', () => {
      this.autoResizeTextarea(chatInput);
    });
  }

  toggleChatbot() {
    const panel = document.getElementById('chatbotPanel');
    const btn = document.getElementById('aiToggleBtn');
    
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      btn.textContent = '✕ Cerrar IA';
      btn.style.background = 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)';
    } else {
      panel.classList.add('hidden');
      btn.textContent = '🤖 AI Assistant';
      btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)';
    }
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || this.isLoading) return;

    this.isLoading = true;
    this.updateSendButton(true);
    
    // Agregar mensaje del usuario
    this.addMessage(message, 'user');
    input.value = '';
    this.autoResizeTextarea(input);

    try {
      // Obtener contexto del editor
      const editorText = this.quill.getText();
      const selectedText = this.getSelectedText();
      
      let response;
      if (this.engine && typeof webllm !== 'undefined') {
        response = await this.generateAIResponse(message, editorText, selectedText);
      } else {
        response = this.generateSimulatedResponse(message, editorText, selectedText);
      }

      this.addMessage(response, 'ai');
      
    } catch (error) {
      console.error('Error generando respuesta:', error);
      this.addMessage('Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.', 'ai');
    } finally {
      this.isLoading = false;
      this.updateSendButton(false);
    }
  }

  async generateAIResponse(message, editorText, selectedText) {
    const context = selectedText || editorText.slice(-500); // Últimos 500 caracteres
    
    const prompt = `Eres un asistente de escritura experto en español. El usuario está trabajando en un documento y necesita ayuda.

Contexto del documento: "${context}"
Mensaje del usuario: "${message}"

Responde de manera útil y concisa en español. Si el usuario pide mejorar texto, proporciona una versión mejorada. Si pide generar contenido, créalo basándote en el contexto. Mantén un tono profesional y amigable.`;

    try {
      const response = await this.engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
        stream: false
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error en generación AI:', error);
      return this.generateSimulatedResponse(message, editorText, selectedText);
    }
  }

  generateSimulatedResponse(message, editorText, selectedText) {
    const msg = message.toLowerCase();
    
    // Respuestas simuladas basadas en palabras clave
    if (msg.includes('mejora') || msg.includes('corrige')) {
      return `He revisado tu texto y aquí tienes algunas sugerencias de mejora:

• Considera usar conectores más variados para mejorar la fluidez
• Algunos párrafos podrían beneficiarse de ejemplos concretos
• La estructura general es sólida, pero podrías añadir más transiciones

¿Te gustaría que trabaje en una sección específica?`;
    }
    
    if (msg.includes('resume') || msg.includes('resumen')) {
      return `Aquí tienes un resumen de tu documento:

El texto aborda los puntos principales de manera clara y organizada. Los temas centrales se desarrollan progresivamente, manteniendo una estructura lógica que facilita la comprensión del lector.

¿Te gustaría que expanda algún punto específico?`;
    }
    
    if (msg.includes('escribe') || msg.includes('genera') || msg.includes('crea')) {
      return `Aquí tienes algunas ideas para continuar tu documento:

1. **Desarrollo del tema principal**: Podrías expandir los conceptos introducidos con ejemplos prácticos y casos de uso reales.

2. **Perspectivas adicionales**: Considera incluir diferentes puntos de vista para enriquecer el contenido.

3. **Conclusiones**: Un párrafo que sintetice las ideas principales sería muy efectivo.

¿Te gustaría que desarrolle alguna de estas ideas?`;
    }

    if (msg.includes('tono') || msg.includes('estilo')) {
      return `Para ajustar el tono de tu texto, considera estos cambios:

• **Más formal**: Usa tercera persona, terminología técnica y estructura más rígida
• **Más casual**: Incluye contracciones, lenguaje coloquial y ejemplos cotidianos
• **Más persuasivo**: Agrega datos, testimonios y llamadas a la acción

¿Qué tono prefieres para tu documento?`;
    }

    if (msg.includes('formato') || msg.includes('estructura')) {
      return `Para mejorar la estructura de tu documento:

• **Títulos y subtítulos**: Organiza el contenido en secciones claras
• **Listas y viñetas**: Facilitan la lectura de información clave
• **Párrafos cortos**: Mejoran la legibilidad en pantalla
• **Transiciones**: Conecta mejor las ideas entre párrafos

¿En qué aspecto estructural quieres que me enfoque?`;
    }

    // Respuesta genérica
    return `Entiendo tu solicitud sobre "${message}". Como asistente de escritura, puedo ayudarte con:

• Mejorar y corregir textos existentes
• Generar contenido nuevo sobre cualquier tema
• Cambiar el tono y estilo de tu escritura
• Estructurar mejor tus ideas
• Crear resúmenes y conclusiones

¿Podrías ser más específico sobre qué tipo de ayuda necesitas con tu documento?`;
  }

  getSelectedText() {
    const selection = this.quill.getSelection();
    if (selection && selection.length > 0) {
      return this.quill.getText(selection.index, selection.length);
    }
    return '';
  }

  addMessage(content, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    if (type === 'ai') {
      messageDiv.innerHTML = `
        ${content}
        <div class="actions">
          <button class="action-btn" onclick="app.insertToEditor('${content.replace(/'/g, "\\'")}')">
            Insertar en editor
          </button>
          <button class="action-btn secondary" onclick="app.copyToClipboard('${content.replace(/'/g, "\\'")}')">
            Copiar
          </button>
        </div>
      `;
    } else {
      messageDiv.textContent = content;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  insertToEditor(text) {
    const selection = this.quill.getSelection() || { index: this.quill.getLength(), length: 0 };
    this.quill.insertText(selection.index, '\n' + text + '\n');
    this.quill.setSelection(selection.index + text.length + 2);
    this.showNotification('Texto insertado en el editor', 'success');
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Texto copiado al portapapeles', 'success');
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
      this.showNotification('Error al copiar texto', 'error');
    }
  }

  updateStatus(message, type) {
    const statusDiv = document.getElementById('aiStatus');
    statusDiv.textContent = message;
    statusDiv.className = `ai-status ${type}`;
    statusDiv.style.display = 'block';
  }

  hideStatus() {
    const statusDiv = document.getElementById('aiStatus');
    statusDiv.style.display = 'none';
  }

  updateSendButton(disabled) {
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = disabled;
    sendBtn.textContent = disabled ? 'Enviando...' : 'Enviar';
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  exportToPDF() {
    const content = document.querySelector('.ql-editor').innerHTML;
    const opt = {
      margin: 1,
      filename: 'documento.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(content).save();
    this.showNotification('PDF exportado exitosamente', 'success');
  }

  exportToText() {
    const text = this.quill.getText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'documento.txt');
    this.showNotification('Texto exportado exitosamente', 'success');
  }

  showNotification(message, type) {
    // Remover notificación existente
    const existing = document.querySelector('.notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 100);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Inicializar la aplicación cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new AIWritingAssistant();
});

// Funciones globales para los botones de acción
window.app = {
  insertToEditor: (text) => app.insertToEditor(text),
  copyToClipboard: (text) => app.copyToClipboard(text)
};