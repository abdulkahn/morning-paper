import {
  editionSnapshotSchema,
  type EditionSnapshot,
  type StorySnapshot,
} from "@/lib/edition/schema";

// Illustrative content for layout and PDF work only. It is labelled as a
// sample in the UI and links to example.com. Real editions come from the
// ingestion pipeline (M3+).

const at = (hour: number) =>
  `2026-10-17T${String(hour).padStart(2, "0")}:00:00Z`;
const src = (name: string, slug: string) => ({
  name,
  url: `https://example.com/${slug}`,
});

function story(
  s: Partial<StorySnapshot> &
    Pick<StorySnapshot, "id" | "tier" | "topic" | "headline" | "dek">,
): StorySnapshot {
  return {
    clusterId: `cluster-${s.id}`,
    whyItMatters: null,
    brief: [],
    keyPoints: [],
    whyInPaper: null,
    continuing: null,
    explainers: [],
    sources: [src("Sample Wire", s.id)],
    publishedAt: at(5),
    readMinutes: s.tier === "brief" ? 0.3 : s.tier === "standard" ? 1 : 1.5,
    ...s,
  };
}

const lead = story({
  id: "robot-hands",
  tier: "lead",
  topic: "Robotics",
  headline:
    "Research labs report humanoid robots learning new tasks from a single demonstration",
  dek: "Several groups now describe robots that watch a person do a task once and repeat it, a step that could make general-purpose machines far cheaper to train.",
  brief: [
    "Until recently, teaching a robot a new manipulation task meant collecting hundreds of demonstrations or months of simulation. New results from several research groups describe systems that generalise from one recorded human demonstration, combining large vision-language models with policies trained across many robot bodies.",
    "The work is still confined to tabletop tasks — folding, sorting, opening containers — and failure rates rise sharply outside the lab. But researchers say the cost curve for teaching robots is bending faster than expected, and several startups are already building products on the approach.",
  ],
  keyPoints: [
    "One-shot imitation works on tabletop tasks in controlled settings.",
    "Models are pre-trained on data from many different robot bodies.",
    "Reliability outside the lab remains the main open problem.",
  ],
  whyInPaper: "You chose robotics stories in 3 of 4 onboarding pairs.",
  explainers: [
    {
      term: "Embodied AI",
      text: "AI systems that act in the physical world through a body, such as a robot, rather than only processing text or images.",
    },
    {
      term: "Policy",
      text: "In robotics, the learned function that maps what a robot senses to the action it takes next.",
    },
  ],
  sources: [
    src("Sample Wire", "robot-hands"),
    src("Tech Desk", "robot-hands-analysis"),
    src("Science Daily Sample", "one-shot-imitation"),
  ],
  publishedAt: at(4),
  readMinutes: 2.5,
});

const sampleEdition: EditionSnapshot = {
  id: "demo",
  number: 1,
  date: "2026-10-17",
  readerName: "Sample Reader",
  isSample: true,
  editorNote:
    "Good morning. This is a sample edition showing how your paper will look. Once you've read a few papers, this note will tell you what your editor has learned — which stories you lean into, which you skip, and how today's paper was shaped around that.",
  lead,
  recall: [],
  sections: [
    {
      slug: "ai",
      title: "Artificial Intelligence",
      stories: [
        story({
          id: "eu-ai-rules",
          tier: "major",
          topic: "AI Policy",
          headline:
            "European committee advances rules on general-purpose AI models",
          dek: "A parliamentary committee approved the draft with two amendments; a full vote is scheduled for Friday.",
          brief: [
            "The committee vote moves the proposal to the full chamber. The amendments narrow the definition of a high-risk system and add a transparency requirement for training data summaries.",
          ],
          keyPoints: [
            "Committee approved the draft.",
            "Two amendments were added.",
            "Final vote scheduled for Friday.",
          ],
          whyInPaper: "You follow this story — 3 new developments.",
          continuing: {
            lastReadAt: "2026-10-14T07:30:00Z",
            newFacts: [
              "Committee approved the proposal.",
              "Two amendments were added on high-risk definitions and data transparency.",
              "Final vote scheduled for Friday.",
            ],
            changedFacts: [],
          },
          sources: [
            src("Sample Wire", "eu-ai"),
            src("Policy Desk", "eu-ai-vote"),
          ],
          readMinutes: 2,
        }),
        story({
          id: "gpu-supply",
          tier: "major",
          topic: "Semiconductors",
          headline:
            "Chipmakers say AI accelerator shortages will ease next year",
          dek: "New packaging capacity coming online should shorten wait times for data-centre GPUs.",
          brief: [
            "Advanced packaging, not chip fabrication itself, has been the bottleneck for AI accelerators. Industry executives now expect new capacity to roughly double output by the second half of next year.",
          ],
          keyPoints: [
            "Packaging capacity, not fabs, was the constraint.",
            "Output expected to double by late next year.",
          ],
          explainers: [
            {
              term: "CUDA",
              text: "NVIDIA's platform for using GPUs for general-purpose computing, widely used to train AI models.",
            },
          ],
        }),
        story({
          id: "open-models",
          tier: "standard",
          topic: "AI Research",
          headline: "Small open models close the gap on reasoning benchmarks",
          dek: "Models under 10 billion parameters now match last year's frontier systems on several maths tests.",
        }),
        story({
          id: "ai-tutors",
          tier: "brief",
          topic: "AI Research",
          headline:
            "Universities pilot AI teaching assistants in introductory courses",
          dek: "Early results show higher homework completion but mixed exam outcomes.",
        }),
      ],
    },
    {
      slug: "pakistan",
      title: "Pakistan",
      stories: [
        story({
          id: "pk-startup-round",
          tier: "major",
          topic: "Pakistan Startups",
          headline:
            "Karachi logistics startup raises the year's largest seed round",
          dek: "The company plans to expand same-day delivery to five more cities.",
          brief: [
            "The round comes as local venture funding recovers from a two-year slowdown. Investors say logistics and fintech remain the most active sectors.",
          ],
          keyPoints: [
            "Largest seed round of the year.",
            "Expansion to five more cities.",
          ],
          whyInPaper: "You asked your editor for more Pakistani startup news.",
          sources: [
            src("Sample Business", "pk-seed"),
            src("Startup Desk", "pk-seed-2"),
          ],
        }),
        story({
          id: "pk-it-exports",
          tier: "standard",
          topic: "Pakistan Economy",
          headline: "IT exports rise for the sixth consecutive month",
          dek: "Freelancers and software houses drove the increase, according to central bank data.",
        }),
        story({
          id: "pk-rail",
          tier: "brief",
          topic: "Pakistan",
          headline: "Rail upgrade cuts Lahore–Islamabad journey time",
          dek: "The upgraded line shortens the trip by around 40 minutes.",
        }),
      ],
    },
    {
      slug: "business",
      title: "Business",
      stories: [
        story({
          id: "battery-shipping",
          tier: "standard",
          topic: "Energy",
          headline: "Battery density gains could reshape short-haul shipping",
          dek: "Higher-density cells make electric coastal freighters viable on routes under 300 km.",
        }),
        story({
          id: "remote-work",
          tier: "brief",
          topic: "Work",
          headline: "Survey: hybrid work settles at three office days a week",
          dek: "Most large employers have stopped changing their policies.",
        }),
      ],
    },
    {
      slug: "sport",
      title: "Sport",
      stories: [
        story({
          id: "football-weekend",
          tier: "standard",
          topic: "Football",
          headline: "Manchester United face crucial run of away fixtures",
          dek: "Three away matches in eight days will test a squad already short of midfielders.",
          whyInPaper: "You mentioned Manchester United during onboarding.",
        }),
        story({
          id: "cricket-series",
          tier: "brief",
          topic: "Cricket",
          headline: "Test series squad announced with two uncapped players",
          dek: "Selectors favoured pace depth for the away tour.",
        }),
      ],
    },
  ],
};

// Fail at import time if the fixture ever drifts from the schema.
export const SAMPLE_EDITION = editionSnapshotSchema.parse(sampleEdition);
