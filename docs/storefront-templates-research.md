# Nuvemshop Template Research — Storefront Theme System

Researched 2026-06-11 by browsing https://www.nuvemshop.com.br/loja-layouts-nuvem and
live demo stores with Playwright. Computed styles extracted from the DOM
(fonts/colors via `getComputedStyle`), section anatomy from the markup.

## Theme catalog + demo store map

Demo URL pattern: `https://<theme>-<variant>-br.lojavirtualnuvem.com.br/`

| Theme | Variants (verticals) |
|---|---|
| **Rio** | theme, beauty, home, textile, accessories, shoes |
| **Recife** | theme, beauty, home, office, couture, deco |
| **Uyuni** | theme, beauty, drinks, fashion |
| **Morelia** | theme, home, clothing, food, denim |
| **Baires** | theme, sports, fashion, wines |
| **Cali** | theme, clothing, home, beauty, fashion |
| **Atlantico** | theme, fashion, deco, clothing |
| **Brasília** | theme, electronics, beauty, home |
| **Flex** | theme, fashion, sports, electronics, jewelry, beauty |

## Extracted profiles (live DOM data)

### Rio (rio-theme-br) — elegant fashion
- **Fonts**: Plus Jakarta Sans (heading + body)
- **Colors**: bg `#F0EEEB` (warm paper), text `#747C6C` (olive), CTA `#CBBC99` (sand), radius 4px
- **Header**: centered wordmark logo, nav row BELOW logo, transparent over hero
- **Anatomy**: announcement → video/image full-bleed hero → circular category bubbles →
  "Destaques" product carousel → promo banner → "Promoções" → image slider → "Lançamentos" → promo banner → newsletter → 4-col footer
- Marketing points: header flexibility, auto video, infinite banners, sortable sections, quick buy

### Uyuni (uyuni-beauty-br) — editorial organic
- **Fonts**: Marcellus (serif, heading + body)
- **Colors**: bg `#FFFAF5` (cream), text `#624328` (coffee), zero radius, thin borders everywhere
- **Header**: hamburger "MENU" left + centered handwritten logo + "BUSCAR"/cart right
- **Anatomy**: full-bleed hero with **boxed/bordered title block** overlaid bottom-left →
  welcome/manifesto text → categories → "ESSENCIAIS" products → testimonials → "NOVIDADES" →
  info banners (FRETE…) → promo banner → instagram feed → newsletter
- Signature: editorial serif, boxed UI elements, storytelling sections

### Brasília (brasilia-electronics-br) — bold tech
- **Fonts**: Chakra Petch (display headings) + Rubik (body)
- **Colors**: white bg, black text, CTA `#E40044` (hot pink/red), dark `#0F0F0F` header, radius 4px
- **Header**: announcement bar (coupon) → dark bar: search input LEFT + centered logo + account/cart →
  full-width category mega-nav row (last item "Sale" highlighted)
- **Anatomy**: split dual-banner hero (GAMING | ACESSÓRIOS) → institutional → "FULL GAMING" featured →
  trust badges ("3 PARCELAS SEM JUROS") → "NOVIDADES" → product spotlight → video special →
  "DESCONTOS SEMANAIS" → newsletter → brand logos
- Signature: aggressive promo tone, search-first header, dense merchandising

### Flex (flex-jewelry-br) — classic premium retail
- **Fonts**: Outfit (heading + body)
- **Colors**: white bg, near-black `#181818` text, gold accents, zero radius
- **Header**: utility topbar (phone, email, Blog/Contato, social) → white bar: search left +
  centered logo + account/cart → nav row with dropdowns
- **Anatomy**: hero slider (arrows + dots, editorial copy + CTA) → trust-badge row
  ("até 10x", "Site 100% Seguro", "Peças Exclusivas") → categories → promos → grid →
  "Novidades" → banners → "Promoções" → testimonials → newsletter
- Signature: trust signals, utility topbar, slider hero

### Morelia (morelia-home-br) — artisanal storytelling
- **Fonts**: Unna (serif, heading + body)
- **Colors**: bg `#F2F1ED` (stone), text `#6A6060`, zero radius
- **Anatomy**: hero modules → "Mais recentes" → slider → "Feito com amor" info banners →
  institutional manifesto ("Num mundo de plástico e ruído…") → workshops video →
  testimonials ("Os nossos amigos") → promo banner → instagram feed
- Signature: brand-story sections between commerce sections

## Pattern synthesis (what every professional template shares)

1. **Optional announcement bar** (promo/coupon/shipping message) above the header
2. **Header** in 3 recurring variants:
   - `centered` — logo centered, nav row below (Rio, Flex)
   - `minimal` — hamburger + centered logo (Uyuni)
   - `search` — prominent search input + logo + actions, nav row below (Brasília, Flex)
3. **Hero** in 3 recurring variants: full-bleed `banner` (image + overlaid copy, optionally boxed),
   `split` dual banners, `slider` with arrows/dots
4. **Category showcase**: circular `bubbles` (Rio) or image `tiles`
5. **Product rails** with section titles: featured / new / sale (16-product catalogs are typical)
6. **Trust/benefits row**: 3-4 icon+title+text items (parcelas, frete, segurança, exclusividade)
7. **Promo banner(s)** mid-page
8. **Storytelling blocks**: manifesto text, testimonials (premium/artisanal themes)
9. **Newsletter** band
10. **Multi-column footer**: departments (categories), navigation, contact + social + payments

## Personalization axes (the SaasTheme equivalent)

| Axis | Range observed |
|---|---|
| Heading/body font pairing | Plus Jakarta Sans · Marcellus · Chakra Petch+Rubik · Outfit · Unna |
| Palette | bg/fg/primary/muted + header bg (light, dark `#0F0F0F`, transparent) |
| Radius | 0 (editorial/premium) → 4-8px (modern) |
| Header variant | centered / minimal / search |
| Hero variant | banner / split / slider; boxed vs free overlay copy |
| Card style | borderless image-led vs bordered card |
| Tone (copy) | promo-aggressive ("CUPOM 10%") vs editorial ("Num mundo de plástico…") |
| Section mix/order | commerce-dense vs storytelling-rich |

## Selected for recreation (4)

| Fayz template | Source | Why |
|---|---|---|
| **`mare`** | Rio | The flagship elegant-fashion pattern; transparent header + bubbles are widely recognizable |
| **`sertao`** | Uyuni | Editorial serif + boxed hero — the strongest "premium organic" look, very distinct |
| **`volt`** | Brasília | The tech/promo archetype — dark header, search-first, split hero, vivid CTA |
| **`atelier`** | Flex | Classic premium retail — utility topbar, slider hero, trust badges; the safest default |

These four cover the personality space (airy/editorial/bold/classic) so any vertical maps to
one of them with only token changes (colors, fonts, copy) — exactly how saas-core themes work.
