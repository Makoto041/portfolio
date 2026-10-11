import { describe, expect, it } from 'vitest'
import { BlockedUrlError, checkPublicHttpUrl, isPublicIp, type LookupAll } from '@/lib/netguard'

describe('isPublicIp', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '100.126.238.0',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.2.10',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
  ])('IPv4 %s は内部向け', (ip) => {
    expect(isPublicIp(ip)).toBe(false)
  })

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '100.128.0.1', '203.0.114.1'])(
    'IPv4 %s は公開',
    (ip) => {
      expect(isPublicIp(ip)).toBe(true)
    },
  )

  it.each([
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:10.0.0.1',
    '::127.0.0.1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'fe80::1%eth0',
    'ff02::1',
    '2001:db8::1',
    '2001::1',
    '64:ff9b::7f00:1',
    '64:ff9b:1::1',
    '2002:7f00:1::1',
    '100::1',
  ])('IPv6 %s は内部向け', (ip) => {
    expect(isPublicIp(ip)).toBe(false)
  })

  it.each([
    '2606:4700:4700::1111',
    '2001:4860:4860::8888',
    '::ffff:8.8.8.8',
    '64:ff9b::808:808',
    '2002:808:808::1',
  ])('IPv6 %s は公開', (ip) => {
    expect(isPublicIp(ip)).toBe(true)
  })

  it('IP でない文字列は false', () => {
    expect(isPublicIp('localhost')).toBe(false)
    expect(isPublicIp('')).toBe(false)
  })
})

describe('checkPublicHttpUrl', () => {
  const lookup =
    (map: Record<string, string[]>): LookupAll =>
    async (host) =>
      (map[host] ?? []).map((address) => ({ address, family: address.includes(':') ? 6 : 4 }))

  it('公開アドレスに解決されるホストは通し、接続先を返す', async () => {
    const t = await checkPublicHttpUrl(
      'https://example.com/a?b=1',
      lookup({ 'example.com': ['93.184.216.34'] }),
    )
    expect(t.address).toBe('93.184.216.34')
    expect(t.url.hostname).toBe('example.com')
  })

  it.each([
    ['ftp://example.com/', 'scheme'],
    ['file:///etc/passwd', 'scheme'],
    ['https://user:pass@example.com/', 'credentials'],
    ['https://example.com:8443/', 'port'],
    ['http://127.0.0.1/', 'address'],
    ['http://[::1]/', 'address'],
    ['http://169.254.169.254/latest/meta-data/', 'address'],
    ['http://localhost/', 'hostname'],
    ['http://printer.local/', 'hostname'],
    ['http://intranet/', 'hostname'],
    ['not a url', 'invalid url'],
  ])('%s は断る（%s）', async (raw, reason) => {
    await expect(checkPublicHttpUrl(raw, lookup({}))).rejects.toThrow(new BlockedUrlError(reason))
  })

  it('解決結果に1つでも内部向けが混じれば断る（DNS の差し替え対策）', async () => {
    await expect(
      checkPublicHttpUrl(
        'https://rebind.example/',
        lookup({ 'rebind.example': ['93.184.216.34', '10.0.0.5'] }),
      ),
    ).rejects.toThrow(BlockedUrlError)
  })

  it('解決できないホストは断る', async () => {
    await expect(checkPublicHttpUrl('https://nowhere.example/', lookup({}))).rejects.toThrow(
      BlockedUrlError,
    )
  })
})
