interface PromptSuggestionButtonProps {
  text: string;
  onClick: () => void;
}

export const PromptSuggestionButton = ({ text, onClick }: PromptSuggestionButtonProps) => {
  return (
    <button className="prompt-suggestion-button" onClick={onClick}>
      {text}
    </button>
  );
};