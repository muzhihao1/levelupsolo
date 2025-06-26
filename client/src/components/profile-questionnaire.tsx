import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { InsertUserProfile } from "@shared/schema";

interface ProfileQuestionnaireProps {
  isOpen: boolean;
  onComplete: (profile: InsertUserProfile) => void;
}

export default function ProfileQuestionnaire({ isOpen, onComplete }: ProfileQuestionnaireProps) {
  const [profile, setProfile] = useState<InsertUserProfile>({
    userId: "",
    name: "",
    age: "",
    occupation: "",
    mission: ""
  });
  const { toast } = useToast();

  const updateProfile = (field: keyof InsertUserProfile, value: string) => {
    setProfile((prev: InsertUserProfile) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      toast({
        title: "请填写所有必填项",
        description: "请确保所有字段都已正确填写",
        variant: "destructive"
      });
      return;
    }

    onComplete(profile);
    toast({
      title: "档案创建成功！",
      description: "AI将根据你的资料提供更精准的建议"
    });
  };

  const isFormValid = () => {
    return profile.name.trim() && 
           profile.age?.trim() && 
           profile.occupation?.trim() && 
           profile.mission?.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setProfile({userId: "", name: "", age: "", occupation: "", mission: ""})}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">
            欢迎使用个人成长追踪系统
          </DialogTitle>
          <p className="text-muted-foreground mt-2">
            请填写你的基本信息，帮助我们为你提供个性化的成长建议
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <Card className="bg-muted border-border">
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    姓名 *
                  </label>
                  <Input
                    value={profile.name}
                    onChange={(e) => updateProfile("name", e.target.value)}
                    placeholder="请输入你的姓名"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    年龄 *
                  </label>
                  <Input
                    value={profile.age || ""}
                    onChange={(e) => updateProfile("age", e.target.value)}
                    placeholder="例如：25"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  职业 *
                </label>
                <Input
                  value={profile.occupation || ""}
                  onChange={(e) => updateProfile("occupation", e.target.value)}
                  placeholder="例如：软件工程师、学生、创业者等"
                  className="bg-background border-border text-foreground"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  个人使命 *
                </label>
                <textarea
                  value={profile.mission || ""}
                  onChange={(e) => updateProfile("mission", e.target.value)}
                  placeholder="描述你的人生目标或使命，例如：成为更好的自己、帮助他人成长、实现财务自由等"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-8">
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="bg-green-500 hover:bg-green-600 text-white px-8"
            >
              完成设置
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="flex justify-center space-x-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              简化版问卷
            </Badge>
            <Badge variant="secondary" className="bg-accent/10 text-accent">
              AI个性化建议
            </Badge>
            <Badge variant="secondary" className="bg-green-50 text-green-600">
              跨设备同步
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            现在只需要填写4个基本信息，帮助我们为你提供个性化的成长建议
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}