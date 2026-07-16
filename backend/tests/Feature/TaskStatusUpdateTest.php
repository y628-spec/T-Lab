<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use Tymon\JWTAuth\Facades\JWTAuth;

class TaskStatusUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_member_can_update_status_of_their_own_task_using_business_labels(): void
    {
        $manager = User::factory()->create([
            'name' => 'Manager User',
            'email' => 'manager.status@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role' => 'Project Manager',
            'status' => 'Active',
            'email_verified_at' => now(),
        ]);

        $member = User::factory()->create([
            'name' => 'Member User',
            'email' => 'member.status@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role' => 'Team Member',
            'status' => 'Active',
            'email_verified_at' => now(),
        ]);

        $project = Project::create([
            'name' => 'Status Project',
            'description' => 'For task status tests',
            'manager_id' => $manager->id,
            'member_ids' => [$member->id],
            'budget' => '500',
            'status' => 'Active',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Status update task',
            'description' => 'A task to update',
            'assignee_id' => $member->id,
            'status' => 'Todo',
            'priority' => 3,
        ]);

        $response = $this->withAuthenticatedUser($member)->putJson('/api/tasks/' . $task->id, [
            'status' => 'To Do',
        ]);

        $response->assertStatus(200);
        $this->assertSame('Todo', $task->fresh()->status);

        $response = $this->withAuthenticatedUser($member)->putJson('/api/tasks/' . $task->id, [
            'status' => 'Done',
        ]);

        $response->assertStatus(200);
        $this->assertSame('Completed', $task->fresh()->status);
    }

    public function test_team_member_cannot_update_status_of_tasks_assigned_to_others(): void
    {
        $manager = User::factory()->create([
            'name' => 'Manager User 2',
            'email' => 'manager.status2@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role' => 'Project Manager',
            'status' => 'Active',
            'email_verified_at' => now(),
        ]);

        $member = User::factory()->create([
            'name' => 'Member User 2',
            'email' => 'member.status2@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role' => 'Team Member',
            'status' => 'Active',
            'email_verified_at' => now(),
        ]);

        $otherMember = User::factory()->create([
            'name' => 'Other Member',
            'email' => 'other.member@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role' => 'Team Member',
            'status' => 'Active',
            'email_verified_at' => now(),
        ]);

        $project = Project::create([
            'name' => 'Protected Project',
            'description' => 'For permission tests',
            'manager_id' => $manager->id,
            'member_ids' => [$member->id, $otherMember->id],
            'budget' => '700',
            'status' => 'Active',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Protected task',
            'description' => 'Should not be updated by another member',
            'assignee_id' => $otherMember->id,
            'status' => 'Todo',
            'priority' => 3,
        ]);

        $response = $this->withAuthenticatedUser($member)->putJson('/api/tasks/' . $task->id, [
            'status' => 'In Progress',
        ]);

        $response->assertStatus(403);
        $this->assertSame('Todo', $task->fresh()->status);
    }

    private function withAuthenticatedUser(User $user)
    {
        $token = JWTAuth::fromUser($user);

        return $this->withHeader('Authorization', 'Bearer ' . $token);
    }
}
