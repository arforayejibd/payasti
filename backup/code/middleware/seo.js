const { SITE_NAME, TAGLINE, SITE_SUBTITLE, SITE_URL, DEFAULT_DESCRIPTION, OG_IMAGE } = require('../config/constants');

function generateSeoMeta(options = {}) {
  const {
    title,
    description,
    image,
    url,
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    keywords = [],
    schema = null,
    exactTitle = null
  } = options;

  const pageTitle = exactTitle || (title 
    ? `${title} | ${SITE_NAME} - ${TAGLINE}` 
    : `${SITE_NAME} - ${TAGLINE} | ${SITE_SUBTITLE}`);

  const metaDesc = (description || DEFAULT_DESCRIPTION)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);

  const canonicalUrl = url ? `${SITE_URL}${url}` : `${SITE_URL}/`;
  const ogImage = image || OG_IMAGE;

  return {
    title: pageTitle,
    description: metaDesc,
    keywords: keywords,
    canonical: canonicalUrl,
    og: {
      title: pageTitle,
      description: metaDesc,
      url: canonicalUrl,
      type: type,
      image: ogImage,
      site_name: `${SITE_NAME} - ${TAGLINE}`,
      locale: 'bn_BD'
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: metaDesc,
      image: ogImage
    },
    articleMeta: type === 'article' ? {
      author: author || 'পয়স্তি লেখক',
      publishedTime: publishedTime,
      modifiedTime: modifiedTime || publishedTime
    } : null,
    schemaJson: schema ? JSON.stringify(schema) : null
  };
}

// Generate Google Structured Data (JSON-LD)
function getArticleSchema(post, author, category) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/post/${post.slug}`
    },
    'headline': post.title,
    'description': post.excerpt || post.title,
    'image': post.featured_image ? [post.featured_image] : [`${SITE_URL}/images/payasti-og-banner.png`],
    'datePublished': post.published_at || post.created_at,
    'dateModified': post.updated_at || post.published_at || post.created_at,
    'inLanguage': 'bn-BD',
    'author': {
      '@type': 'Person',
      'name': author ? (author.display_name || author.username) : 'পয়স্তি লেখক',
      'url': author ? `${SITE_URL}/author/${encodeURIComponent(author.slug || author.nicename || author.username || '')}` : SITE_URL
    },
    'publisher': {
      '@type': 'Organization',
      'name': `${SITE_NAME} - ${TAGLINE}`,
      'url': SITE_URL,
      'logo': {
        '@type': 'ImageObject',
        'url': `${SITE_URL}/images/payasti-logo.png`
      }
    },
    'articleSection': category ? category.name : 'সাহিত্য'
  };

  if (post && post.rating_count && Number(post.rating_count) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': parseFloat(post.rating_score || 5).toFixed(1),
      'bestRating': '5',
      'worstRating': '1',
      'ratingCount': parseInt(post.rating_count, 10)
    };
  }

  return schema;
}

function getBookSchema(book) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    'name': book.title,
    'author': {
      '@type': 'Person',
      'name': book.author_name
    },
    'image': book.cover_image,
    'description': book.description || book.title,
    'offers': {
      '@type': 'Offer',
      'price': book.discounted_price ? book.discounted_price.replace(/[^\d]/g, '') : '',
      'priceCurrency': 'BDT',
      'availability': 'https://schema.org/InStock',
      'url': book.order_url || `${SITE_URL}/book/${book.slug}`
    }
  };
}

function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['NewsMediaOrganization', 'Organization'],
        '@id': `${SITE_URL}/#organization`,
        'name': 'Payasti Magazine',
        'url': SITE_URL,
        'sameAs': ['https://www.facebook.com/payastimagazine/'],
        'logo': {
          '@type': 'ImageObject',
          '@id': `${SITE_URL}/#logo`,
          'url': `${SITE_URL}/images/Payasti-logo.png`,
          'contentUrl': `${SITE_URL}/images/Payasti-logo.png`,
          'inLanguage': 'bn-BD'
        }
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        'url': SITE_URL,
        'name': `${SITE_NAME} - ${TAGLINE}`,
        'publisher': { '@id': `${SITE_URL}/#organization` },
        'inLanguage': 'bn-BD',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${SITE_URL}/?s={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        'url': `${SITE_URL}/`,
        'name': `${SITE_NAME} - ${TAGLINE} | ${SITE_SUBTITLE}`,
        'about': { '@id': `${SITE_URL}/#organization` },
        'isPartOf': { '@id': `${SITE_URL}/#website` },
        'inLanguage': 'bn-BD'
      }
    ]
  };
}

function getBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': `${SITE_URL}${item.url}`
    }))
  };
}

function getSpellCheckerSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/bangla-spell#webapp`,
        'name': 'পয়স্তি বাংলা বানান শুদ্ধিকরণ ও সংশোধন (Bangla Spell Checker)',
        'alternateName': [
          'অনলাইন বাংলা বানান পরীক্ষক',
          'Bangla Spell Checker',
          'Bengali Spelling Corrector',
          'বাংলা বানান শুদ্ধ করার টুল',
          'Bangla Banan Shuddhikoron'
        ],
        'url': `${SITE_URL}/bangla-spell`,
        'applicationCategory': 'UtilitiesApplication',
        'operatingSystem': 'All',
        'browserRequirements': 'Requires JavaScript. Requires HTML5.',
        'description': 'বাংলা একাডেমি প্রমিত বানানরীতি ও ১ লক্ষাধিক শব্দের অভিধান সম্বলিত ফ্রি অনলাইন বাংলা বানান পরীক্ষক ও শুদ্ধিকরণ সফটওয়্যার।',
        'inLanguage': 'bn-BD',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'BDT'
        },
        'publisher': {
          '@type': 'Organization',
          'name': `${SITE_NAME} - ${TAGLINE}`,
          'url': SITE_URL,
          'logo': {
            '@type': 'ImageObject',
            'url': `${SITE_URL}/images/Payasti-logo.png`
          }
        }
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/bangla-spell#faq`,
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'অনলাইন বাংলা বানান শুদ্ধিকরণ বা স্পেল চেকার টুল কী?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'পয়স্তি বাংলা বানান শুদ্ধিকরণ হলো একটি আধুনিক ফ্রি অনলাইন টুল যা বাংলা একাডেমির প্রমিত বানানরীতি অনুসরণ করে যেকোনো বাংলা টেক্সটের ভুল বানান নিমেষেই সনাক্ত করে এবং এক ক্লিকে সঠিক রূপ সাজেস্ট করে।'
            }
          },
          {
            '@type': 'Question',
            'name': 'কীভাবে অনলাইনে বাংলা বানান পরীক্ষা ও সংশোধন করবেন?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'এডিটরে আপনার বাংলা লেখা পেস্ট বা টাইপ করুন। ভুল শব্দগুলোর নিচে লাল দাগ আসবে। ভুল শব্দের ওপর ক্লিক করে অথবা ডানপাশের ভুলের তালিকা থেকে শুদ্ধ শব্দে ক্লিক করলেই তা এডিটরে সঙ্গে সঙ্গে ঠিক হয়ে যাবে।'
            }
          },
          {
            '@type': 'Question',
            'name': 'এই টুলটি কি বাংলা একাডেমির নতুন প্রমিত বানান নিয়ম মানে?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'হ্যাঁ, এটি সম্পূর্ণভাবে বাংলা একাডেমির আধুনিক প্রমিত বানানরীতি ও ১,০০,০০০+ প্রমিত শব্দের অভিধান দ্বারা পরিচালিত।'
            }
          },
          {
            '@type': 'Question',
            'name': 'পয়স্তি বানান পরীক্ষক কি বিনামূল্যে ব্যবহার করা যায়?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'হ্যাঁ, কোনো প্রকার লগইন বা সাবস্ক্রিপশন ছাড়াই যেকোনো লেখক, শিক্ষার্থী ও পেশাজীবী বিনামূল্যে সীমাহীন লেখা বানান শুদ্ধ করতে পারবেন।'
            }
          }
        ]
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}/bangla-spell#breadcrumb`,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'হোম',
            'item': `${SITE_URL}/`
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'বাংলা বানান শুদ্ধিকরণ',
            'item': `${SITE_URL}/bangla-spell`
          }
        ]
      }
    ]
  };
}

module.exports = {
  generateSeoMeta,
  getArticleSchema,
  getBookSchema,
  getWebsiteSchema,
  getBreadcrumbSchema,
  getSpellCheckerSchema
};
