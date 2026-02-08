import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface OrderImage {
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
}

interface OrderMilestonesProps {
  orderId: string;
  orderNumber: string;
}

export default function OrderMilestones({ orderId, orderNumber }: OrderMilestonesProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [orderImages, setOrderImages] = useState<OrderImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('order_milestones')
        .select('*')
        .eq('order_id', orderId)
        .order('milestone_order');

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);

      // Fetch order images (up to 8)
      const { data: imagesData, error: imagesError } = await supabase
        .from('order_images')
        .select('*')
        .eq('order_id', orderId)
        .order('image_order')
        .limit(8);

      if (imagesError) throw imagesError;
      setOrderImages(imagesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load order data');
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
      fetchData();
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 8 - orderImages.length;
    if (files.length > remainingSlots) {
      toast.error(`Can only upload ${remainingSlots} more image(s). Maximum 8 images per order.`);
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `orders/${orderId}/${Date.now()}_${i}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('order-images')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('order_images')
          .insert({
            order_id: orderId,
            image_url: publicUrl,
            image_order: orderImages.length + i
          });

        if (dbError) throw dbError;
      }

      toast.success(`${files.length} image(s) uploaded successfully`);
      fetchData();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/order-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        
        // Delete from storage
        await supabase.storage
          .from('order-images')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('order_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Image deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Milestones Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crafting Milestones - Order #{orderNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Check off each milestone as it's completed
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {milestones.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No milestones created yet for this order.
            </p>
          ) : (
            milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border"
              >
                <Checkbox
                  id={`milestone-${milestone.id}`}
                  checked={milestone.is_completed}
                  onCheckedChange={() => toggleMilestoneCompletion(milestone.id, milestone.is_completed)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`milestone-${milestone.id}`}
                    className={`text-sm font-medium cursor-pointer ${
                      milestone.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {milestone.milestone_name}
                  </label>
                  {milestone.is_completed && milestone.completed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed on {new Date(milestone.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Order Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Images ({orderImages.length}/8)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload up to 8 images showing the crafting process
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Button */}
          {orderImages.length < 8 && (
            <div>
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById('image-upload')?.click()}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : `Upload Images (${8 - orderImages.length} remaining)`}
              </Button>
              <input
                id="image-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Image Grid - 2 rows x 4 columns */}
          {orderImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {orderImages.map((image, index) => (
                <div key={image.id} className="relative group aspect-square">
                  <img
                    src={image.image_url}
                    alt={`Order image ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border-2 border-border"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteImage(image.id, image.image_url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No images uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
