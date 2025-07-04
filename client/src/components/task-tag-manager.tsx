import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskTagManagerProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
  placeholder?: string;
  maxTags?: number;
}

const DEFAULT_TAGS = [
  "写作", "编程", "学习", "运动", "生活", "工作", 
  "创作", "设计", "管理", "社交", "技术", "研究"
];

const TAG_COLORS: Record<string, string> = {
  "写作": "bg-blue-100 text-blue-800 hover:bg-blue-200",
  "编程": "bg-green-100 text-green-800 hover:bg-green-200", 
  "学习": "bg-purple-100 text-purple-800 hover:bg-purple-200",
  "运动": "bg-red-100 text-red-800 hover:bg-red-200",
  "生活": "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  "工作": "bg-gray-100 text-gray-800 hover:bg-gray-200",
  "创作": "bg-pink-100 text-pink-800 hover:bg-pink-200",
  "设计": "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  "管理": "bg-orange-100 text-orange-800 hover:bg-orange-200",
  "社交": "bg-teal-100 text-teal-800 hover:bg-teal-200",
  "技术": "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  "研究": "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
};

export default function TaskTagManager({ 
  selectedTags, 
  onTagsChange, 
  availableTags = DEFAULT_TAGS,
  placeholder = "添加标签...",
  maxTags = 5
}: TaskTagManagerProps) {
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const { toast } = useToast();

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim();
    
    if (!normalizedTag) return;
    
    if (selectedTags.includes(normalizedTag)) {
      toast({
        title: "标签已存在",
        description: "该标签已经添加过了",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedTags.length >= maxTags) {
      toast({
        title: "标签数量超限",
        description: `最多只能添加 ${maxTags} 个标签`,
        variant: "destructive"
      });
      return;
    }
    
    onTagsChange([...selectedTags, normalizedTag]);
    setNewTag("");
    setIsAddingTag(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(newTag);
    } else if (e.key === 'Escape') {
      setNewTag("");
      setIsAddingTag(false);
    }
  };

  const getTagColor = (tag: string) => {
    return TAG_COLORS[tag] || "bg-slate-100 text-slate-800 hover:bg-slate-200";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Tag className="w-4 h-4" />
        <span>任务标签</span>
        <span className="text-xs text-gray-500">({selectedTags.length}/{maxTags})</span>
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={`${getTagColor(tag)} transition-colors cursor-pointer`}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add New Tag */}
      {isAddingTag ? (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="flex-1"
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => addTag(newTag)}
            disabled={!newTag.trim()}
          >
            添加
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewTag("");
              setIsAddingTag(false);
            }}
          >
            取消
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingTag(true)}
          disabled={selectedTags.length >= maxTags}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加标签
        </Button>
      )}

      {/* Quick Add from Available Tags */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500">快速添加:</div>
          <div className="flex flex-wrap gap-1">
            {availableTags
              .filter(tag => !selectedTags.includes(tag))
              .slice(0, 8)
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  disabled={selectedTags.length >= maxTags}
                  className={`px-2 py-1 text-xs rounded-full border border-gray-200 hover:border-gray-300 
                    ${getTagColor(tag)} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {tag}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}