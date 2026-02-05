import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon, Monitor } from 'lucide-react';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { currentUser } = useERPAuth();
  const { theme, setTheme, isDark } = useTheme();
  
  const toggleDarkMode = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme === 'dark' ? 'Dark' : 'Light'} mode`);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    const themeLabels = {
      light: 'Light',
      dark: 'Dark',
      system: 'System'
    };
    toast.success(`Theme changed to ${themeLabels[newTheme]} mode`);
  };
  
  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your application preferences</p>
          </div>

          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the application looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleThemeChange('light')}
                      className={`flex items-center gap-2 ${
                        theme === 'light' ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      <SunIcon className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleThemeChange('dark')}
                      className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      <MoonIcon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleThemeChange('system')}
                      className={`flex items-center gap-2 ${
                        theme === 'system' ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      <Monitor className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'system' 
                      ? 'Follows your system preference' 
                      : `Currently using ${theme} theme`
                    }
                  </p>
                </div>

                {/* Legacy Toggle (for backward compatibility) */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Quick Toggle</Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch 
                    id="dark-mode" 
                    checked={isDark}
                    onCheckedChange={toggleDarkMode}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
