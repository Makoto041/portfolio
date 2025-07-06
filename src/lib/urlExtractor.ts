// URLを抽出するユーティリティ関数

export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g
  const matches = text.match(urlRegex)
  return matches || []
}

export function extractUrlsFromRichText(richTextData: any): string[] {
  if (!richTextData || !richTextData.root || !richTextData.root.children) {
    return []
  }

  const urls: string[] = []

  function traverse(node: any) {
    if (node.type === 'text' && node.text) {
      urls.push(...extractUrlsFromText(node.text))
    }
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(traverse)
    }
  }

  richTextData.root.children.forEach(traverse)
  
  // 重複を除去
  return [...new Set(urls)]
}