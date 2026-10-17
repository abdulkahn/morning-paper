"use client";

import Image from "next/image";
import { useState } from "react";
import { storyImageSchema, topicImage } from "@/lib/edition/images";
import type { StorySnapshot } from "@/lib/edition/schema";

export function StoryVisual({
  story,
}: {
  story: Pick<StorySnapshot, "image" | "topic">;
}) {
  const supplied = storyImageSchema.safeParse(story.image);
  const image = supplied.success ? supplied.data : topicImage(story.topic);
  // Track the failed URL so a route change can show a different story's image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!image) return null;

  return (
    <figure className="story-visual">
      <div className="story-visual-frame">
        {failedUrl === image.url ? (
          <div className="story-visual-unavailable" role="status">
            <span className="font-display text-3xl">{story.topic}</span>
            <span className="mt-2 text-xs">Photograph unavailable</span>
          </div>
        ) : (
          <Image
            src={image.url}
            alt={image.alt}
            width={1000}
            height={667}
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(image.url)}
          />
        )}
      </div>
      <figcaption>
        {image.kind === "topic" ? "Topic photograph" : "Source image"}
        {" · "}
        <a href={image.creditUrl} target="_blank" rel="noopener noreferrer">
          {image.credit}
        </a>
      </figcaption>
    </figure>
  );
}
