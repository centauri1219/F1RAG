import { PromptSuggestionButton } from './PromptSuggestionButton';

interface PromptSuggestionRowProps {
  onPromptClick: (prompt: string) => void;
}

export const PromptSuggestionRow = ({ onPromptClick }: PromptSuggestionRowProps) => {
  const prompts = [
    'Who is current F1 world champion?',
    'Who is the highest paid F1 driver?',
    'Who will be the newest F1 driver for Ferrari?',
  ];
  return (
    <div className="prompt-suggestion-row">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton
          key={`suggestion-${index}`}
          text={prompt}
          onClick={() => onPromptClick(prompt)}
        />
      ))}
    </div>
  );
};