"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { User, Key, Shield, Settings } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "./profile-tab";
import { PasswordTab } from "./password-tab";
import { SecurityTab } from "./security-tab";
import { PreferencesTab } from "./preferences-tab";

interface Props {
  brandSlug: string;
}

export default function AccountSettingsClient({ brandSlug }: Props) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Pengaturan Akun</h1>
        <p className="text-sm text-muted-foreground">Kelola profil, keamanan, dan preferensi akun Anda.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="size-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Key className="size-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="size-4" />
            Keamanan
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="size-4" />
            Preferensi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab brandSlug={brandSlug} />
        </TabsContent>

        <TabsContent value="password">
          <PasswordTab brandSlug={brandSlug} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab brandSlug={brandSlug} />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesTab brandSlug={brandSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
