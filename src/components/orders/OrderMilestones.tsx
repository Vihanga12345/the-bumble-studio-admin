import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon, Check } from 'lucide-react';

interface MilestoneImage {
  id: string;
  image_url: string;
  image_order: number;
}

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_order: number;
  is_completed: boolean;
  completed_at: string | null;
  images: MilestoneImage[];
}

interface OrderMilestonesProps {
  orderId: string;
  orderNumber: string;
}

export default function OrderMilestones({ orderId, orderNumber }: OrderMilestonesProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingMilestone, setUploadingMilestone] = useState<string | null>(null);

  useEffect(() => {
    fetchMilestones();
  }, [orderId]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      
      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('order_milestones')
        .select('*')
        .eq('order_id', orderId)
        .order('milestone_order');

      if (milestonesError) throw milestonesError;

      // Fetch images for each milestone
      const milestonesWithImages = await Promise.all(
        (milestonesData || []).map(async (milestone) => {
          const { data: imagesData } = await supabase
            .from('milestone_images')
            .select('*')
            .eq('milestone_id', milestone.id)
            .order('image_order');

          return {
            ...milestone,
            images: imagesData || []
          };
        })
      );

      setMilestones(milestonesWithImages);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestoneCompletion = async (milestoneId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('order_milestones')
        .update({
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId);

      if (error) throw error;

      toast.success(!currentStatus ? 'Milestone completed' : 'Milestone marked as incomplete');
      fetchMilestones();
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  const handleImageUpload = async (milestoneId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    // Check if adding these files would exceed 4 images
    if (milestone.images.length + files.length > 4) {
      toast.error('Maximum 4 images per milestone');
      return;
    }

    setUploadingMilestone(milestoneId);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}/${milestoneId}/${Date.now()}_${i}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('milestone-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('milestone-images')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('milestone_images')
          .insert({
            milestone_id: milestoneId,
            image_url: publicUrl,
            image_order: milestone.images.length + i
          });

        if (dbError) throw dbError;
      }

      toast.success(`${files.length} image(s) uploaded successfully`);
      fetchMilestones();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingMilestone(null);
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/milestone-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        
        // Delete from storage
        await supabase.storage
          .from('milestone-images')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('milestone_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Image deleted successfully');
      fetchMilestones();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading milestones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Milestones - {orderNumber}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track crafting process and upload images (max 4 per milestone)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`border rounded-lg p-3 ${
              milestone.is_completed 
                ? 'bg-amber-50 border-amber-600' 
                : 'bg-white border-gray-300'
            }`}
          >
            {/* Compact Header with Images */}
            <div className="flex items-center gap-3">
              {/* Checkbox and Name */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <Checkbox
                  checked={milestone.is_completed}
                  onCheckedChange={() => toggleMilestoneCompletion(milestone.id, milestone.is_completed)}
                  id={`milestone-${milestone.id}`}
                  className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <Label
                  htmlFor={`milestone-${milestone.id}`}
                  className={`text-sm font-semibold cursor-pointer flex items-center gap-1 ${
                    milestone.is_completed ? 'text-amber-900' : 'text-gray-900'
                  }`}
                >
                  {milestone.milestone_name}
                  {milestone.is_completed && <Check className="h-4 w-4 text-amber-600" />}
                </Label>
              </div>

              {/* Images in a row */}
              <div className="flex items-center gap-2 flex-1">
                {milestone.images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.image_url}
                      alt={`${milestone.milestone_name} - ${image.image_order + 1}`}
                      className="w-16 h-16 object-cover rounded border-2 border-gray-300"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      onClick={() => deleteImage(image.id, image.image_url)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {/* Upload button - compact */}
                {milestone.images.length < 4 && (
                  <Label
                    htmlFor={`upload-${milestone.id}`}
                    className="cursor-pointer"
                  >
                    <div className="w-16 h-16 border-2 border-dashed border-amber-400 rounded flex items-center justify-center hover:bg-amber-100 hover:border-amber-600 transition-colors">
                      <Upload className="h-5 w-5 text-amber-600" />
                    </div>
                    <Input
                      id={`upload-${milestone.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageUpload(milestone.id, e)}
                      disabled={uploadingMilestone === milestone.id}
                    />
                  </Label>
                )}
              </div>

              {/* Count */}
              <div className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                {milestone.images.length}/4
              </div>
            </div>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Milestones will be created automatically</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
