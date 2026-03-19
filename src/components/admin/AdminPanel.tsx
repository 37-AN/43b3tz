'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  BarChart3,
  PieChart,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Mock admin data
const mockStats = {
  totalUsers: 12453,
  activeUsers: 2341,
  totalBets: 89542,
  totalVolume: 2450000,
  platformProfit: 245000,
  activeTipsters: 156,
  pendingWithdrawals: 23,
};

const mockRecentUsers = [
  { id: '1', email: 'john@example.com', name: 'John Doe', role: 'user', balance: 500, createdAt: '2024-01-15', status: 'active' },
  { id: '2', email: 'jane@example.com', name: 'Jane Smith', role: 'tipster', balance: 1200, createdAt: '2024-01-14', status: 'active' },
  { id: '3', email: 'mike@example.com', name: 'Mike Johnson', role: 'user', balance: 0, createdAt: '2024-01-13', status: 'suspended' },
  { id: '4', email: 'sarah@example.com', name: 'Sarah Wilson', role: 'user', balance: 350, createdAt: '2024-01-12', status: 'active' },
  { id: '5', email: 'david@example.com', name: 'David Brown', role: 'tipster', balance: 5000, createdAt: '2024-01-11', status: 'active' },
];

const mockTransactions = [
  { id: '1', type: 'deposit', amount: 500, status: 'completed', user: 'john@example.com', date: '2024-01-15 10:30' },
  { id: '2', type: 'withdrawal', amount: 200, status: 'pending', user: 'jane@example.com', date: '2024-01-15 09:15' },
  { id: '3', type: 'subscription', amount: 29.99, status: 'completed', user: 'mike@example.com', date: '2024-01-14 18:45' },
  { id: '4', type: 'deposit', amount: 1000, status: 'completed', user: 'sarah@example.com', date: '2024-01-14 16:20' },
  { id: '5', type: 'commission', amount: 45.50, status: 'completed', user: 'Platform', date: '2024-01-14 14:00' },
];

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-400" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage users, monitor transactions, and view analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            Admin Access
          </Badge>
          <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-cyan-400" />}
          label="Total Users"
          value={mockStats.totalUsers.toLocaleString()}
          change="+124"
          positive
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          label="Active Now"
          value={mockStats.activeUsers.toLocaleString()}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-yellow-400" />}
          label="Total Volume"
          value={`R${(mockStats.totalVolume / 1000000).toFixed(1)}M`}
          change="+12%"
          positive
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          label="Platform Profit"
          value={`R${(mockStats.platformProfit / 1000).toFixed(0)}K`}
          change="+8%"
          positive
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Users
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="tipsters" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Tipsters
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab users={mockRecentUsers} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionsTab transactions={mockTransactions} />
        </TabsContent>

        <TabsContent value="tipsters" className="space-y-4">
          <TipstersTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  change, 
  positive 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            {icon}
          </div>
          {change && (
            <div className={`flex items-center gap-1 text-xs ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-white mt-3">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Quick Actions */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Tips
              <Badge className="ml-2 bg-emerald-500/30">5</Badge>
            </Button>
            <Button className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30">
              <Clock className="w-4 h-4 mr-2" />
              Pending Withdrawals
              <Badge className="ml-2 bg-yellow-500/30">{mockStats.pendingWithdrawals}</Badge>
            </Button>
            <Button className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Flagged Users
              <Badge className="ml-2 bg-red-500/30">3</Badge>
            </Button>
            <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
              <Users className="w-4 h-4 mr-2" />
              Verify Tipsters
              <Badge className="ml-2 bg-purple-500/30">8</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'New user registration', user: 'mike@example.com', time: '2 min ago', type: 'user' },
              { action: 'Large deposit', user: 'john@example.com', time: '5 min ago', type: 'money', amount: 'R5,000' },
              { action: 'Tipster verification request', user: 'ProBettingSA', time: '10 min ago', type: 'tipster' },
              { action: 'Withdrawal request', user: 'jane@example.com', time: '15 min ago', type: 'money', amount: 'R2,000' },
              { action: 'Value bet triggered', user: 'System', time: '20 min ago', type: 'ai' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.type === 'user' ? 'bg-cyan-500/20 text-cyan-400' :
                    activity.type === 'money' ? 'bg-yellow-500/20 text-yellow-400' :
                    activity.type === 'tipster' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {activity.type === 'user' ? <Users className="w-4 h-4" /> :
                     activity.type === 'money' ? <DollarSign className="w-4 h-4" /> :
                     activity.type === 'tipster' ? <Users className="w-4 h-4" /> :
                     <Activity className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm text-white">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                  {activity.amount && (
                    <p className="text-sm font-medium text-yellow-400">{activity.amount}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ users }: { users: any[] }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">User Management</CardTitle>
        <Button className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
          <Users className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">User</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Role</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Balance</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Status</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Joined</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm text-white">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={user.role === 'tipster' 
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    }>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-white">R{user.balance}</td>
                  <td className="py-3 px-4">
                    <Badge className={user.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{user.createdAt}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionsTab({ transactions }: { transactions: any[] }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' :
                  tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                  tx.type === 'subscription' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-white capitalize">{tx.type}</p>
                  <p className="text-xs text-muted-foreground">{tx.user}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  tx.type === 'deposit' || tx.type === 'subscription' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {tx.type === 'withdrawal' ? '-' : '+'}R{tx.amount}
                </p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <Badge className={tx.status === 'completed' 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }>
                {tx.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TipstersTab() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-bold">
                    T{i}
                  </div>
                  <div>
                    <p className="text-sm text-white">Tipster #{i}</p>
                    <p className="text-xs text-muted-foreground">Requested 2 days ago</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
                    Approve
                  </Button>
                  <Button size="sm" className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['ProBettingSA', 'ValueHunter', 'AfricanKing'].map((name, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm text-white">{name}</p>
                    <p className="text-xs text-muted-foreground">ROI: {(25 + i * 5)}%</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-400">R{(5000 + i * 2000).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end justify-between gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gradient-to-t from-emerald-500 to-cyan-500 rounded-t"
                  style={{ height: `${40 + Math.random() * 60}%` }}
                />
                <span className="text-xs text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white">R45.2K</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">R182K</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">+24%</p>
              <p className="text-xs text-muted-foreground">Growth</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            User Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'South Africa', value: 45, color: 'bg-emerald-500' },
              { label: 'Nigeria', value: 20, color: 'bg-cyan-500' },
              { label: 'Kenya', value: 15, color: 'bg-purple-500' },
              { label: 'UK', value: 10, color: 'bg-yellow-500' },
              { label: 'Other', value: 10, color: 'bg-gray-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{item.label}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
