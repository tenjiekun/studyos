// ===== SYLLABUS TEXT PARSER =====
// Parses pasted syllabus text into structured {subject, chapters[]} format

export interface ParsedSubject {
  name: string;
  chapters: ParsedChapter[];
}

export interface ParsedChapter {
  name: string;
  topics: string[];
  estimated_hours: number | null;
  needsReview: boolean; // parser was uncertain about this entry
}

/**
 * Main parser entry point
 * Analyzes pasted text and returns structured syllabus data
 */
export function parseSyllabusText(text: string): ParsedSubject[] {
  if (!text.trim()) return [];

  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const subjects: ParsedSubject[] = [];

  let currentSubject: ParsedSubject | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

    // Check if this line is a subject header
    if (isSubjectHeader(line, nextLine)) {
      if (currentSubject) subjects.push(currentSubject);
      currentSubject = {
        name: cleanSubjectName(line),
        chapters: [],
      };
      continue;
    }

    // Check if this line is a chapter entry
    if (currentSubject && isChapterEntry(line)) {
      const chapter = parseChapterLine(line);
      currentSubject.chapters.push(chapter);
      continue;
    }

    // Check if this line is a sub-topic under a chapter
    if (currentSubject && currentSubject.chapters.length > 0 && isTopicEntry(line)) {
      const lastChapter = currentSubject.chapters[currentSubject.chapters.length - 1];
      lastChapter.topics.push(cleanTopicName(line));
      continue;
    }
  }

  if (currentSubject) subjects.push(currentSubject);

  return subjects;
}

/**
 * Detect if a line is a subject header
 * Patterns:
 *   "Physics"
 *   "PHYSICS"
 *   "PHYSICS:"
 *   "=== Physics ==="
 *   "Physics (Theory)"
 */
function isSubjectHeader(line: string, nextLine: string | null): boolean {
  const cleaned = line.replace(/[=:*\-_=\[\]]/g, "").trim();

  // Check if it's an ALL CAPS or Title Case line followed by numbered items or blank
  const isAllCaps = cleaned === cleaned.toUpperCase() && cleaned.length > 1 && cleaned.length < 40;
  const isTitleCase = /^[A-Z][a-z]+( [A-Za-z]+)*$/.test(cleaned) && cleaned.length < 40;

  // Subject headers are usually followed by numbered chapters or blank lines
  const nextIsChapter = nextLine ? isChapterEntry(nextLine) : false;
  const nextIsEmpty = nextLine === null || nextLine === "";

  if (isAllCaps || isTitleCase) {
    if (nextIsChapter || nextIsEmpty || subjects.includes(cleaned.toLowerCase())) {
      return true;
    }
  }

  // Check for "=== Subject ===" pattern
  if (/^[=\-*_]{2,}\s*\w/.test(line) && /[a-zA-Z]\s*[=\-*_]{2,}$/.test(line)) {
    return true;
  }

  return false;
}

// Common subject names for detection
const subjects = ["physics", "chemistry", "mathematics", "math", "biology", "english", "hindi",
  "computer science", "history", "geography", "economics", "political science", "psychology",
  "sociology", "philosophy", "statistics", "accountancy", "business studies", "environmental science"];

function cleanSubjectName(line: string): string {
  return line
    .replace(/[=:*\-_\[\]]/g, "")
    .replace(/\(.*\)/g, "")
    .trim();
}

/**
 * Detect if a line is a chapter entry
 * Patterns:
 *   "1. Units and Measurements"
 *   "Chapter 1: Units"
 *   "* Kinematics"
 *   "- Laws of Motion"
 *   "• Work, Energy and Power"
 *   "1) Thermodynamics"
 */
function isChapterEntry(line: string): boolean {
  // Numbered: "1." "1)" "1:" "(1)"
  if (/^\d+[\.\)\:]\s*\w/.test(line)) return true;
  // "Chapter N" or "Ch. N"
  if (/^(chapter|ch\.?)\s*\d+/i.test(line)) return true;
  // Bullet markers
  if (/^[\*\-\•\·]\s*\w/.test(line)) return true;
  // Roman numerals: "I." "II." "III."
  if (/^(i{1,3}|iv|v|vi{0,3}|ix|x)[\.\)]\s*\w/i.test(line)) return true;
  // Check if it's a short line (likely a chapter name) after a subject header
  if (line.length < 60 && /^[A-Z]/.test(line) && !isSubjectHeader(line, null)) {
    return false; // Could be ambiguous, don't auto-classify
  }
  return false;
}

function parseChapterLine(line: string): ParsedChapter {
  let name = line
    .replace(/^\d+[\.\)\:]\s*/, "")  // Remove "1. "
    .replace(/^(chapter|ch\.?)\s*\d+[\:\.\)]\s*/i, "") // Remove "Chapter 1: "
    .replace(/^[\*\-\•\·]\s*/, "")   // Remove "- "
    .replace(/^(i{1,3}|iv|v|vi{0,3}|ix|x)[\.\)]\s*/i, "") // Remove Roman numerals
    .trim();

  // Check if name ends with hour estimate like "(4h)" or "[6 hrs]"
  const hoursMatch = name.match(/[\(\[]\s*(\d+)\s*(h|hrs?|hours?)\s*[\)\]]/i);
  const estimatedHours = hoursMatch ? parseInt(hoursMatch[1]) : null;
  if (hoursMatch) {
    name = name.replace(/[\(\[]\s*\d+\s*(h|hrs?|hours?)\s*[\)\]]/i, "").trim();
  }

  // Mark uncertain entries
  const needsReview = name.length < 3 || /^\d+$/.test(name);

  return { name, topics: [], estimated_hours: estimatedHours || 5, needsReview };
}

function isTopicEntry(line: string): boolean {
  // Sub-indented items: "  - Coulomb's Law" or "    * Electric Field"
  if (/^\s{2,}[\*\-\•\·]\s*\w/.test(line)) return true;
  // Sub-numbered: "1.1 Electric Charge" or "a) Subtopic"
  if (/^\s+\d+\.\d+\s+\w/.test(line)) return true;
  if (/^\s+[a-z][\.\)]\s+\w/.test(line)) return true;
  return false;
}

function cleanTopicName(line: string): string {
  return line
    .replace(/^\s+/, "")
    .replace(/^[\*\-\•\·]\s*/, "")
    .replace(/^\d+\.\d+\s*/, "")
    .replace(/^[a-z][\.\)]\s*/, "")
    .trim();
}
