import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { LayoutComponent } from './shared/components/layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { WorkflowsComponent } from './pages/workflows/workflows';
import { DepartmentsComponent } from './pages/departments/departments';
import { UsersComponent } from './pages/users/users';
import { RolesComponent } from './pages/roles/roles';
import { ChatComponent } from './pages/chat/chat';
import { LeadsComponent } from './pages/leads/leads';
import { ClientsComponent } from './pages/clients/clients';
import { SettingsComponent } from './pages/settings/settings';
import { PostsComponent } from './pages/posts/posts';
import { InvoicesComponent } from './pages/invoices/invoices';
import { InvoiceCreateComponent } from './pages/invoices/create/invoice-create';
import { InvoiceDetailComponent } from './pages/invoices/detail/invoice-detail';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'workflows', component: WorkflowsComponent },
      { path: 'departments', component: DepartmentsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'roles', component: RolesComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'leads', component: LeadsComponent },
      { path: 'clients', component: ClientsComponent },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'invoices/create', component: InvoiceCreateComponent },
      { path: 'invoices/:id', component: InvoiceDetailComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'posts', component: PostsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
