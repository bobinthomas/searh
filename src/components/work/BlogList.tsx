"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { revealBatch } from "@/components/anim/Reveal";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
};

export function BlogList({ posts }: { posts: Post[] }) {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    return revealBatch(itemRefs.current, { y: 40, scale: 0.97, stagger: 0.1 });
  }, [posts.length]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const cleanups = itemRefs.current.map((el) => {
      if (!el) return () => {};
      const onEnter = () =>
        gsap.to(el, { x: 10, duration: 0.4, ease: "back.out(2)", overwrite: true });
      const onLeave = () =>
        gsap.to(el, { x: 0, duration: 0.35, ease: "power2.out", overwrite: true });
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      };
    });
    return () => cleanups.forEach((fn) => fn());
  }, [posts.length]);

  return (
    <div className="mt-12 space-y-8">
      {posts.map((post, i) => (
        <Link
          key={post.id}
          href={`/blog/${post.slug}`}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="group block"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] group-hover:underline">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-1 text-[var(--color-muted-ink)]">{post.excerpt}</p>
          )}
          {post.published_at && (
            <time
              dateTime={post.published_at}
              className="mt-2 block text-sm text-[var(--color-muted-ink)]"
            >
              {new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
        </Link>
      ))}
    </div>
  );
}
