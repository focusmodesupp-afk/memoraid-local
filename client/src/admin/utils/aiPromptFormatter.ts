type DevTask = {
  id: string;
  title: string;
  description: string | null;
  priority?: string;
  category: string | null;
  assignee: string | null;
  labels?: string[] | null;
  estimateHours?: number | null;
  dueDate?: string | null;
  columnId?: string | null;
};

type NexusDoc = {
  doc_type: string;
  title: string | null;
  content: string;
};

type PromptContext = {
  sprintName?: string;
  sprintId?: string;
  columnName?: string;
  nexusDocs?: NexusDoc[];
  briefTitle?: string;
};

export function formatTaskForAI(task: DevTask, context?: PromptContext): string {
  const priorityLabel = task.priority === 'high' ? '🔴 High' : task.priority === 'medium' ? '🟡 Medium' : '⚪ Low';

  let prompt = `# 🎯 משימת פיתוח: ${task.title}\n\n`;
  prompt += `**מזהה:** \`${task.id}\``;
  if (context?.sprintName) prompt += ` | **ספרינט:** ${context.sprintName}`;
  prompt += ` | **עדיפות:** ${priorityLabel}`;
  if (task.estimateHours) prompt += ` | **הערכה:** ${task.estimateHours}h`;
  if (task.category) prompt += ` | **קטגוריה:** ${task.category}`;
  prompt += `\n\n---\n\n`;

  if (task.description) {
    prompt += `${task.description}\n\n`;
  }

  if (task.labels && task.labels.length > 0) {
    prompt += `**תגיות:** ${task.labels.join(', ')}\n\n`;
  }

  prompt += `---\n\n`;
  prompt += `כשתסיים: עדכן את המשימה \`${task.id}\` ל-Done בקנבאן.\n`;

  return prompt;
}

function getCategoryEmoji(category: string | null): string {
  if (!category) return '📦';
  
  const emojis: Record<string, string> = {
    email: '📧',
    calendar: '📅',
    admin: '⚙️',
    testing: '🧪',
    optimization: '⚡',
    ai: '🤖',
    mobile: '📱',
    security: '🔒',
    performance: '🚀',
  };
  
  return emojis[category] || '📦';
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
