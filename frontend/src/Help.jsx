import React from 'react';
import DesktopLayout from './components/Desktop/DesktopLayout.jsx';
import useMobile from './hooks/useMobile.js';
import './Help.css';

/**
 * Help page component
 * Displays contact information and system version
 */
export default function Help() {
  const { isMobile } = useMobile();
  
  // Force mobile for testing
  const forceMobile = window.innerWidth < 768;
  
  if (isMobile || forceMobile) {
    // Mobile view - redirect to dashboard for now
    return (
      <div className="help-mobile">
        <div className="help-mobile__container">
          <h1>Página de Ajuda</h1>
          <p>Esta página está disponível apenas na versão desktop.</p>
          <a href="/dashboard" className="btn btn--primary">Voltar ao Dashboard</a>
        </div>
      </div>
    );
  }
  
  // Desktop view
  return (
    <DesktopLayout>
      <div className="help">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">Central de Ajuda</h1>
          <p className="page-header__subtitle">Informações de contato e suporte técnico</p>
        </div>

        {/* Help Content */}
        <div className="help-content">
          {/* Contact Information */}
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">
                <span className="card__icon">📞</span>
                Informações de Contato
              </h2>
              <p className="card__subtitle">Entre em contato conosco para suporte</p>
            </div>
            
            <div className="card__body">
              <div className="contact-grid">
                <div className="contact-item">
                  <div className="contact-item__icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div className="contact-item__content">
                    <h3 className="contact-item__title">Email</h3>
                    <p className="contact-item__value">contato@supermercadoflorais.com.br</p>
                    <a 
                      href="mailto:contato@supermercadoflorais.com.br" 
                      className="contact-item__link"
                    >
                      Enviar Email
                    </a>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-item__icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <div className="contact-item__content">
                    <h3 className="contact-item__title">WhatsApp</h3>
                    <p className="contact-item__value">+55 65 9 8137-2085</p>
                    <a 
                      href="https://wa.me/5565981372085" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="contact-item__link"
                    >
                      Abrir WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">
                <span className="card__icon">ℹ️</span>
                Informações do Sistema
              </h2>
              <p className="card__subtitle">Detalhes técnicos da aplicação</p>
            </div>
            
            <div className="card__body">
              <div className="system-info">
                <div className="system-info__item">
                  <span className="system-info__label">Versão do Sistema:</span>
                  <span className="system-info__value">0.1.0</span>
                </div>
                <div className="system-info__item">
                  <span className="system-info__label">Tipo de Aplicação:</span>
                  <span className="system-info__value">Sistema de Crédito</span>
                </div>
                <div className="system-info__item">
                  <span className="system-info__label">Desenvolvido para:</span>
                  <span className="system-info__value">Supermercado Florais</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">
                <span className="card__icon">❓</span>
                Perguntas Frequentes
              </h2>
              <p className="card__subtitle">Dúvidas comuns sobre o sistema</p>
            </div>
            
            <div className="card__body">
              <div className="faq-list">
                <div className="faq-item">
                  <h3 className="faq-item__question">Como criar uma nova solicitação de crédito?</h3>
                  <p className="faq-item__answer">
                    Acesse o menu "Nova Solicitação" no sidebar, selecione um paciente, 
                    preencha os dados da solicitação e gere o código PIX.
                  </p>
                </div>
                
                <div className="faq-item">
                  <h3 className="faq-item__question">Como visualizar o status das minhas solicitações?</h3>
                  <p className="faq-item__answer">
                    No Dashboard, você pode ver suas últimas solicitações e seus status. 
                    Clique em "Ver Detalhes" para mais informações.
                  </p>
                </div>
                
                <div className="faq-item">
                  <h3 className="faq-item__question">Como gerenciar pacientes?</h3>
                  <p className="faq-item__answer">
                    Acesse o menu "Pacientes" para cadastrar, editar e visualizar 
                    todos os pacientes do sistema.
                  </p>
                </div>
                
                <div className="faq-item">
                  <h3 className="faq-item__question">Preciso de ajuda técnica, o que fazer?</h3>
                  <p className="faq-item__answer">
                    Entre em contato conosco através do email ou WhatsApp informados acima. 
                    Nossa equipe de suporte está disponível para ajudar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}
