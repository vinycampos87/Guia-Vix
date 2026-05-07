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
  const finalOgImage = ogImage || settings?.ogImage || settings?.logoUrl || '';
  const finalCanonical = canonical || window.location.href;
  const showIndexing = settings?.indexingEnabled !== false;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      
      {/* Robots */}
      {!showIndexing && <meta name="robots" content="noindex, nofollow" />}
      {showIndexing && <meta name="robots" content="index, follow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:url" content={finalCanonical} />
      <meta property="og:site_name" content="Guia VIX" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalOgImage} />

      {/* Canonical Link */}
      <link rel="canonical" href={finalCanonical} />

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
