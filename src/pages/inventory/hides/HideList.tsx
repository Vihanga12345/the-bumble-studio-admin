import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { useHides } from '@/hooks/useHides';

const HideList = () => {
  const navigate = useNavigate();
  const { hides } = useHides();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return hides.filter((hide) => {
      const bySearch =
        hide.hideName.toLowerCase().includes(search.toLowerCase()) ||
        (hide.supplierName || '').toLowerCase().includes(search.toLowerCase());
      const byType = typeFilter === 'all' || hide.hideType === typeFilter;
      const created = hide.createdAt;
      const byFrom = !dateFrom || created >= new Date(`${dateFrom}T00:00:00`);
      const byTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`);
      return bySearch && byType && byFrom && byTo;
    });
  }, [dateFrom, dateTo, hides, search, typeFilter]);

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Hides</h1>
                <p className="text-muted-foreground">Manage hide purchases, availability and traceability</p>
              </div>
            </div>
            <Button onClick={() => navigate('/inventory/hides/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Hide
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hide List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Search hide/supplier" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Full grain">Full grain</SelectItem>
                    <SelectItem value="Top Grain">Top Grain</SelectItem>
                    <SelectItem value="Low Grade">Low Grade</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hide Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Finishing</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">SQ Feet</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((hide) => (
                    <TableRow key={hide.id} className="cursor-pointer" onClick={() => navigate(`/inventory/hides/${hide.id}`)}>
                      <TableCell className="font-medium">{hide.hideName}</TableCell>
                      <TableCell>{hide.hideType}</TableCell>
                      <TableCell>{hide.finishing}</TableCell>
                      <TableCell>{hide.supplierName || '-'}</TableCell>
                      <TableCell className="text-right">{hide.sqFeet.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Rs {hide.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={hide.isAvailable ? 'default' : 'secondary'}>{hide.isAvailable ? 'Available' : 'Not Available'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HideList;
