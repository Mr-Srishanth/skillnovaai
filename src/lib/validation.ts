const NONSENSE_PATTERNS = /^(hi|hello|hey|abc|test|asdf|qwerty|aaa|bbb|xxx|lol|ok|yes|no|haha|hmm|idk|bruh|sup|yo|nah|please|help|nothing|none|na|n\/a|nil|null|undefined|random|whatever|stuff|things|blah|foo|bar|baz|123|1234|12345)\s*$/i;

const COMMON_SKILLS = [
  "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin",
  "html", "css", "sass", "less", "sql", "nosql", "mongodb", "postgresql", "mysql", "sqlite",
  "react", "angular", "vue", "svelte", "next", "nuxt", "django", "flask", "express", "node",
  "spring", "rails", ".net", "laravel", "fastapi",
  "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "jenkins", "ci/cd",
  "git", "github", "gitlab", "linux", "bash", "shell",
  "machine learning", "deep learning", "ai", "nlp", "computer vision", "tensorflow", "pytorch", "scikit",
  "data analysis", "data science", "pandas", "numpy", "r", "tableau", "power bi", "excel",
  "figma", "photoshop", "illustrator", "sketch", "xd", "ui", "ux",
  "agile", "scrum", "jira", "project management", "communication", "leadership", "teamwork",
  "rest", "graphql", "api", "microservices", "system design", "algorithms", "data structures",
  "blockchain", "solidity", "web3", "cybersecurity", "networking", "devops", "sre",
  "unity", "unreal", "blender", "three.js", "webgl",
  "flutter", "react native", "ionic", "android", "ios", "mobile",
  "redis", "elasticsearch", "kafka", "rabbitmq", "nginx", "apache",
  "testing", "jest", "cypress", "selenium", "playwright",
  "wordpress", "shopify", "wix", "seo", "marketing", "analytics",
];

const COMMON_ROLES = [
  "developer", "engineer", "designer", "analyst", "scientist", "manager", "architect",
  "frontend", "backend", "fullstack", "full stack", "devops", "sre", "qa", "tester",
  "data", "machine learning", "ai", "ml", "deep learning", "nlp",
  "product", "project", "scrum master", "agile coach",
  "cybersecurity", "security", "network", "cloud", "infrastructure",
  "mobile", "android", "ios", "flutter", "react native",
  "ui", "ux", "graphic", "motion", "visual",
  "marketing", "seo", "content", "growth", "brand",
  "business", "consultant", "sales", "support", "technical writer",
  "game", "blockchain", "web3", "embedded", "firmware", "hardware",
  "cto", "ceo", "vp", "lead", "senior", "junior", "intern", "principal", "staff",
];

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[,;|\/\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function validateSkills(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, error: "Please enter your current skills." };
  if (NONSENSE_PATTERNS.test(trimmed)) {
    return { valid: false, error: "Please enter valid technical skills (e.g. Python, SQL, React)." };
  }

  const tokens = tokenize(trimmed);
  if (tokens.length < 2) {
    return { valid: false, error: "Please enter at least 2 skills separated by commas." };
  }

  // Check if at least one token is recognizable
  const hasRecognizable = tokens.some((t) =>
    COMMON_SKILLS.some((s) => t.includes(s) || s.includes(t))
  );
  if (!hasRecognizable) {
    return { valid: false, error: "Skills don't look valid. Examples: Python, SQL, React, JavaScript." };
  }

  return { valid: true };
}

export function validateRole(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, error: "Please enter your target job role." };
  if (NONSENSE_PATTERNS.test(trimmed)) {
    return { valid: false, error: "Please enter a real job role (e.g. Data Scientist, Web Developer)." };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: "Role name is too short. Try: Full Stack Developer, Data Analyst." };
  }

  const lower = trimmed.toLowerCase();
  const hasRecognizable = COMMON_ROLES.some((r) => lower.includes(r));
  if (!hasRecognizable && trimmed.split(/\s+/).length < 2) {
    return { valid: false, error: "Doesn't look like a job role. Examples: AI Engineer, Frontend Developer." };
  }

  return { valid: true };
}
