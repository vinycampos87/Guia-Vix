import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../App';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  type?: string;
}

export default function SEO({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  canonical,
  type = 'website' 
}: SEOProps) {
  const { settings } = useAuth();

  const finalTitle = title || settings?.siteTitle || 'Guia VIX - Guia Comercial de Vitória';
  const finalDescription = description || settings?.metaDescription || 'Encontre as melhores empresas, vagas de emprego e classificados em Vitória e região.';
  const finalKeywords = keywords || settings?.keywords || 'vitoria, guia vix, empresas, empregos, classificados, espirito santo';
  
  // Prioritize specific image, then global SEO image, then site logo
  const finalOgImage = ogImage || settings?.ogImage || settings?.logoUrl || '';
  
  const finalCanonical = canonical || window.location.href;
  const showIndexing = settings?.indexingEnabled !== false;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} key="description" />
      <meta name="keywords" content={finalKeywords} key="keywords" />
      
      {/* Robots */}
      {!showIndexing && <meta name="robots" content="noindex, nofollow" key="robots" />}
      {showIndexing && <meta name="robots" content="index, follow" key="robots" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} key="og:type" />
      <meta property="og:title" content={finalTitle} key="og:title" />
      <meta property="og:description" content={finalDescription} key="og:description" />
      <meta property="og:image" content={finalOgImage} key="og:image" />
      <meta property="og:url" content={finalCanonical} key="og:url" />
      <meta property="og:site_name" content="Guia VIX" key="og:site_name" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:title" content={finalTitle} key="twitter:title" />
      <meta name="twitter:description" content={finalDescription} key="twitter:description" />
      <meta name="twitter:image" content={finalOgImage} key="twitter:image" />

      {/* Canonical Link */}
      <link rel="canonical" href={finalCanonical} key="canonical" />

      {/* Google Analytics */}
      {settings?.googleAnalyticsId && (
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`} />
      )}
      {settings?.googleAnalyticsId && (
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${settings.googleAnalyticsId}');
          `}
        </script>
      )}
    </Helmet>
  );
}
