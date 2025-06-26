import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  expReward: number;
  icon?: string;
}

export default function AchievementModal({
  isOpen,
  onClose,
  title,
  description,
  expReward,
  icon = "fas fa-trophy"
}: AchievementModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <i className={`${icon} text-white text-3xl`}></i>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">成就解锁！</h3>
        <h4 className="text-lg font-semibold text-amber-400 mb-2">{title}</h4>
        <p className="text-gray-400 mb-6">{description}</p>
        <div className="text-3xl font-bold text-green-400 mb-4">+{expReward} XP</div>
        <Button 
          onClick={onClose}
          className="bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 px-8 rounded-lg hover:shadow-lg transition-all duration-300"
        >
          太棒了！
        </Button>
      </DialogContent>
    </Dialog>
  );
}
