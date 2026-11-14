// Yerel Supabase için varsayılan adres. Paylaşılan test sitesinde ayrı test projesinin adresini girin.
window.TARIHIZ_CONFIG = {
  apiBase: ['localhost','127.0.0.1'].includes(location.hostname)
    ? 'http://127.0.0.1:54321/functions/v1/tarihiz-api' : '',
  feedbackFormUrl: ''
};
