import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 flex items-center shadow-md">
        <button onClick={() => navigate(-1)} className="mr-3 hover:bg-blue-700 p-1 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Política de Privacidade</h1>
      </div>

      <div className="p-4 max-w-3xl mx-auto bg-white mt-4 shadow-sm rounded-lg">
        <div className="prose prose-blue max-w-none">
          <h2>1. Introdução</h2>
          <p>
            Bem-vindo ao Guia VIX. Esta Política de Privacidade explica como coletamos, usamos, 
            divulgamos e protegemos suas informações quando você usa nosso aplicativo da web e serviços.
          </p>

          <h2>2. Coleta de Informações</h2>
          <p>
            Coletamos informações que você nos fornece diretamente, como quando você cria uma conta, 
            atualiza seu perfil, usa os recursos de autenticação social (como o login do Google) 
            ou entra em contato com o suporte ao cliente.
          </p>

          <h2>3. Uso das Informações</h2>
          <p>
            Usamos as informações que coletamos para fornecer, manter e melhorar nossos serviços, 
            processar transações, enviar avisos técnicos, atualizações, alertas de segurança e suporte.
          </p>

          <h2>4. Compartilhamento de Informações</h2>
          <p>
            Não compartilhamos suas informações pessoais com terceiros, exceto conforme descrito 
            nesta política de privacidade ou conforme exigido por lei.
          </p>

          <h2>5. Segurança</h2>
          <p>
            Tomamos medidas razoáveis para ajudar a proteger as informações sobre você contra 
            perda, roubo, uso indevido, acesso não autorizado, divulgação, alteração e destruição.
          </p>

          <h2>6. Contato</h2>
          <p>
            Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato conosco 
            através do e-mail de suporte fornecido no aplicativo.
          </p>
          
          <p className="text-sm text-gray-500 mt-8">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyScreen;
