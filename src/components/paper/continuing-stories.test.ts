import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { ContinuingStories } from "./continuing-stories";

it("opens the authenticated reader using the cluster ID for a live edition", () => {
  const html = renderToStaticMarkup(
    createElement(ContinuingStories, {
      edition: SAMPLE_EDITION,
      storyHref: "/story/saved-edition",
    }),
  );
  expect(html).toContain('href="/story/saved-edition/cluster-eu-ai-rules"');
  expect(html).not.toContain('href="#story-eu-ai-rules"');
});

it("keeps sample and archived update navigation within the saved paper", () => {
  const html = renderToStaticMarkup(
    createElement(ContinuingStories, {
      edition: SAMPLE_EDITION,
    }),
  );
  expect(html).toContain('href="#story-eu-ai-rules"');
  expect(html).not.toContain('href="/story/');
});
