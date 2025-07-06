export interface UrlMetadata {
  title?: string
  description?: string
  image?: string
  siteName?: string
  url: string
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Timeline Bot/1.0)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    
    // 正規表現を使用してメタデータを抽出
    const metadata: UrlMetadata = {
      url,
      title: extractMetaContent(html, 'og:title') || 
             extractMetaContent(html, 'twitter:title') ||
             extractTitleTag(html) ||
             undefined,
      description: extractMetaContent(html, 'og:description') || 
                   extractMetaContent(html, 'twitter:description') ||
                   extractMetaContent(html, 'description') ||
                   undefined,
      image: extractMetaContent(html, 'og:image') || 
             extractMetaContent(html, 'twitter:image') ||
             undefined,
      siteName: extractMetaContent(html, 'og:site_name') || 
                extractMetaContent(html, 'twitter:site') ||
                undefined,
    }
    
    return metadata
  } catch (error) {
    console.error('Error fetching URL metadata:', error)
    return null
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // og:プロパティとname属性の両方をチェック
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*?)["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*?)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*name=["']${property}["']`, 'i'),
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

function extractTitleTag(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : null
}