// filepath: /Users/dev/Documents/insuite/public/escripts/escript.js
// Añadir efecto de hover a las cards
document.querySelectorAll('.app-card, .large-app-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.boxShadow = '0 4px 20px rgba(0,120,212,0.3)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.boxShadow = 'none';
  });
});

// Efecto de ripple en los botones
document.querySelectorAll('.app-card, .large-app-card, .install-button').forEach(element => {
  element.addEventListener('click', function(e) {
    const ripple = document.createElement('div');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background-color: rgba(255,255,255,0.3);
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;
    
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});

// Añadir animación CSS para el ripple
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Simular funcionalidad del botón instalar
document.querySelector('.install-button').addEventListener('click', function() {
  openApp('Microsoft Store');
});


    function openApp(appName) {
        let url = '';
        switch (appName) {
            case 'MDPDF':
                // Replace with the actual URL for MDPDF (e.g., a download link or web app URL)
                url = 'https://mdpdf.inled.es';
                break;
            case 'inlinked':
                // Replace with the actual URL for inLinked web application
                url = 'https://inlinked.inled.es/';
                break;
            case 'inmd':
                // Replace with the actual URL for inMD
                url = 'https://inmd.inled.es';
                break;
            case 'indoc':
                // Replace with the actual URL for inDOC
                url = 'https://indoc.inled.es';
                break;
            case 'inqr':
                // Replace with the actual URL for inqr
                url = 'https://inqr.inled.es';
                break;
            case 'inpdf':
                // Replace with the actual URL for inqr
                url = 'https://inpdf.inled.es';
                break;
            case 'start':
                // Replace with the actual URL for Start
                url = 'https://start.inled.es/';
                break;
            case 'somnibox':
                // Replace with the actual URL for Start Omnibox
                url = 'https://new.inled.es/startomnibox/'; // Example for a browser extension
                break;
            case 'sntp':
                // Replace with the actual URL for Start New Tab Page
                url = 'https://new.inled.es/startntp/'; // Example for a browser extension
                break;
            case 'domaininfo':
                // Replace with the actual URL for Domain Info
                url = 'https://status.inled.es/ipcheck';
                break;
            case 'serverstatus':
                // Replace with the actual URL for Server Status
                url = 'https://status.inled.es/';
                break;
            case 'swiftinstall':
                // Replace with the actual download URL for Swiftinstall (e.g., .deb file)
                url = 'https://new.inled.es/swiftinstall/';
                break;
            case 'warpvpngui':
                // Replace with the actual download URL for Warp VPN GUI
                url = 'https://new.inled.es/warp/';
                break;
            case 'cruzcristianagnome':
                // Replace with the actual URL for Cruz Cristiana GNOME extension/page
                url = 'https://extensions.gnome.org/extension/8060/christian-cross-in-gnome-bar/';
                break;
            case 'memorywarn':
                // Replace with the actual download URL for Memory Warn
                url = 'https://new.inled.es/memorywarn/';
                break;
            case 'winerror':
                // Replace with the actual URL for Windows Error (e.g., a fun web page or small executable)
                url = 'https://new.inled.es/winerror/';
                break;
            case 'winbsod':
                // Replace with the actual URL for Win BSOD
                url = 'https://new.inled.es/winbsod/';
                break;
            default:
                alert('Error. No se encuentra el enlace al servicio. Visite inled.es', appName);
                return; // Exit if no URL is defined
        }

        if (url) {
            window.open(url, '_blank'); // Opens the URL in a new tab
        }
    }

const menuToggle = document.getElementById('menu-toggle');
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    document.querySelector('.mobile-menu')?.classList.toggle('active');
  });
}
