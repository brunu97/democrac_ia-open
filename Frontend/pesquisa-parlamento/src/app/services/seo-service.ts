import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SITE = 'https://www.democrac-ia.pt';
const DEFAULT_IMAGE = `${SITE}/fundo.JPG`;

export interface SeoData {
  title: string;
  description?: string;
  path?: string;
  index?: boolean;
  ogType?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  image?: string;
}


@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  update(data: SeoData): void {
    const indexable = data.index !== false;
    const url = SITE + (data.path ?? this.doc.location.pathname);
    const desc = data.description ?? '';
    const ogTitle = data.ogTitle ?? data.title;
    const ogDesc = data.ogDescription ?? desc;
    const twitterTitle = data.twitterTitle ?? ogTitle;
    const twitterDesc = data.twitterDescription ?? desc;
    const image = data.image ?? DEFAULT_IMAGE;

    this.titleService.setTitle(data.title);
    if (desc) {
      this.meta.updateTag({ name: 'description', content: desc });
    }

    this.meta.updateTag({ property: 'og:type', content: data.ogType ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    if (ogDesc) {
      this.meta.updateTag({ property: 'og:description', content: ogDesc });
    }
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: twitterTitle });
    if (twitterDesc) {
      this.meta.updateTag({ name: 'twitter:description', content: twitterDesc });
    }
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.meta.updateTag({
      name: 'robots',
      content: indexable ? 'index, follow' : 'noindex, nofollow',
    });

    this.setCanonical(indexable ? url : null);
  }

  private setCanonical(url: string | null): void {
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>("link[rel='canonical']");

    if (!url) {
      link?.remove();
      return;
    }

    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
