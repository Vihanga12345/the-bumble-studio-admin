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
          Track the crafting process and upload up to 4 images per milestone
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`border rounded-lg p-4 space-y-4 ${
              milestone.is_completed ? 'bg-green-50 border-green-200' : 'bg-white'
            }`}
          >
            {/* Milestone Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={milestone.is_completed}
                  onCheckedChange={() => toggleMilestoneCompletion(milestone.id, milestone.is_completed)}
                  id={`milestone-${milestone.id}`}
                />
                <Label
                  htmlFor={`milestone-${milestone.id}`}
                  className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                >
                  {milestone.milestone_name}
                  {milestone.is_completed && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                {milestone.images.length}/4 images
              </div>
            </div>

            {/* Images Grid */}
            {milestone.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {milestone.images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.image_url}
                      alt={`${milestone.milestone_name} - ${image.image_order + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteImage(image.id, image.image_url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {milestone.images.length < 4 && (
              <div>
                <Label
                  htmlFor={`upload-${milestone.id}`}
                  className="cursor-pointer"
                >
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {uploadingMilestone === milestone.id
                        ? 'Uploading...'
                        : 'Click to upload images'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {4 - milestone.images.length} remaining
                    </p>
                  </div>
                </Label>
                <Input
                  id={`upload-${milestone.id}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(milestone.id, e)}
                  disabled={uploadingMilestone === milestone.id}
                />
              </div>
            )}
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No milestones found for this order</p>
            <p className="text-sm">Milestones will be created automatically</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
