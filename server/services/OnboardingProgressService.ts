import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";

export interface OnboardingProgress {
  id: string;
  userId: string;
  currentStep: 'payment_completed' | 'profile_form' | 'document_upload' | 'ai_analysis' | 'prompt_generation' | 'setup_complete';
  stepsCompleted: string[];
  totalSteps: number;
  completionPercentage: number;
  paymentCompletedAt?: Date;
  profileFormCompletedAt?: Date;
  documentUploadCompletedAt?: Date;
  aiAnalysisCompletedAt?: Date;
  promptGenerationCompletedAt?: Date;
  setupCompletedAt?: Date;
  skipDocumentUpload: boolean;
  autoGeneratePrompts: boolean;
  startedAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingStepInfo {
  step: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  completedAt?: Date;
  estimatedTimeMinutes: number;
  requirements: string[];
  benefits: string[];
}

export class OnboardingProgressService {
  private readonly ONBOARDING_STEPS = [
    'payment_completed',
    'profile_form',
    'document_upload',
    'ai_analysis',
    'prompt_generation',
    'setup_complete'
  ];

  private readonly STEP_INFO: Record<string, Omit<OnboardingStepInfo, 'isCompleted' | 'isActive' | 'completedAt'>> = {
    payment_completed: {
      step: 'payment_completed',
      title: 'Payment Completed',
      description: 'Your subscription has been activated successfully',
      estimatedTimeMinutes: 0,
      requirements: ['Valid payment method', 'Subscription selection'],
      benefits: ['Access to all SharpFlow features', 'AI agent customization', 'Lead qualification tools']
    },
    profile_form: {
      step: 'profile_form',
      title: 'Company Profile Setup',
      description: 'Tell us about your business to customize your AI agents',
      estimatedTimeMinutes: 5,
      requirements: ['Company name', 'Industry', 'Target market'],
      benefits: ['Personalized AI responses', 'Industry-specific terminology', 'Better lead qualification']
    },
    document_upload: {
      step: 'document_upload',
      title: 'Document Upload',
      description: 'Upload company documents for enhanced AI understanding',
      estimatedTimeMinutes: 3,
      requirements: ['PDF documents (optional)', 'Company brochures or product docs'],
      benefits: ['More accurate AI insights', 'Company-specific terminology', 'Enhanced prompt customization']
    },
    ai_analysis: {
      step: 'ai_analysis',
      title: 'AI Document Analysis',
      description: 'Our AI analyzes your documents to extract business insights',
      estimatedTimeMinutes: 2,
      requirements: ['Uploaded documents', 'OpenAI API access'],
      benefits: ['Automated data extraction', 'Business intelligence insights', 'Enhanced company profile']
    },
    prompt_generation: {
      step: 'prompt_generation',
      title: 'AI Prompt Generation',
      description: 'Generate customized prompts for your AI agents',
      estimatedTimeMinutes: 3,
      requirements: ['Complete company profile', 'AI analysis results'],
      benefits: ['Personalized AI agents', 'Industry-specific responses', 'Improved lead qualification']
    },
    setup_complete: {
      step: 'setup_complete',
      title: 'Setup Complete',
      description: 'Your SharpFlow system is ready to use!',
      estimatedTimeMinutes: 0,
      requirements: ['All previous steps completed'],
      benefits: ['Fully customized AI system', 'Ready for lead generation', 'Optimized for your business']
    }
  };

  /**
   * Initialize onboarding progress for a new user after payment
   */
  async initializeOnboarding(userId: string): Promise<OnboardingProgress> {
    try {
      const progressId = uuidv4();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('onboarding_progress')
        .upsert({
          id: progressId,
          user_id: userId,
          current_step: 'payment_completed',
          steps_completed: ['payment_completed'],
          total_steps: this.ONBOARDING_STEPS.length,
          completion_percentage: Math.round((1 / this.ONBOARDING_STEPS.length) * 100),
          payment_completed_at: now,
          skip_document_upload: false,
          auto_generate_prompts: true,
          started_at: now,
          last_activity_at: now,
          created_at: now,
          updated_at: now,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to initialize onboarding: ${error.message}`);
      }

      return this.mapDatabaseToProgress(data);
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      throw error;
    }
  }

  /**
   * Get onboarding progress for a user
   */
  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No progress found
        }
        throw new Error(`Failed to get onboarding progress: ${error.message}`);
      }

      return this.mapDatabaseToProgress(data);
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Update onboarding step completion
   */
  async completeStep(
    userId: string,
    step: string,
    skipToNext: boolean = true
  ): Promise<OnboardingProgress> {
    try {
      // Get current progress
      let progress = await this.getProgress(userId);
      
      // Initialize if doesn't exist
      if (!progress) {
        progress = await this.initializeOnboarding(userId);
      }

      // Validate step
      if (!this.ONBOARDING_STEPS.includes(step)) {
        throw new Error(`Invalid onboarding step: ${step}`);
      }

      // Add step to completed if not already there
      const stepsCompleted = [...progress.stepsCompleted];
      if (!stepsCompleted.includes(step)) {
        stepsCompleted.push(step);
      }

      // Determine next step
      const currentStepIndex = this.ONBOARDING_STEPS.indexOf(step);
      const nextStep = skipToNext && currentStepIndex < this.ONBOARDING_STEPS.length - 1
        ? this.ONBOARDING_STEPS[currentStepIndex + 1]
        : step;

      // Calculate completion percentage
      const completionPercentage = Math.round((stepsCompleted.length / this.ONBOARDING_STEPS.length) * 100);

      // Prepare update data
      const updateData: any = {
        current_step: nextStep,
        steps_completed: stepsCompleted,
        completion_percentage: completionPercentage,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Set specific step timestamp
      const timestampField = this.getTimestampField(step);
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      // Update progress
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update onboarding progress: ${error.message}`);
      }

      return this.mapDatabaseToProgress(data);
    } catch (error) {
      console.error('Error completing onboarding step:', error);
      throw error;
    }
  }

  /**
   * Skip document upload step
   */
  async skipDocumentUpload(userId: string): Promise<OnboardingProgress> {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update({
          skip_document_upload: true,
          current_step: 'prompt_generation',
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to skip document upload: ${error.message}`);
      }

      return this.mapDatabaseToProgress(data);
    } catch (error) {
      console.error('Error skipping document upload:', error);
      throw error;
    }
  }

  /**
   * Get detailed onboarding steps with completion status
   */
  async getDetailedSteps(userId: string): Promise<OnboardingStepInfo[]> {
    try {
      const progress = await this.getProgress(userId);
      
      return this.ONBOARDING_STEPS.map((stepName, index) => {
        const stepInfo = this.STEP_INFO[stepName];
        const isCompleted = progress?.stepsCompleted.includes(stepName) || false;
        const isActive = progress?.currentStep === stepName;
        
        // Get completion timestamp
        let completedAt: Date | undefined;
        if (isCompleted && progress) {
          const timestampField = this.getTimestampField(stepName);
          if (timestampField) {
            const timestamp = (progress as any)[this.camelCase(timestampField)];
            completedAt = timestamp ? new Date(timestamp) : undefined;
          }
        }

        return {
          ...stepInfo,
          isCompleted,
          isActive,
          completedAt,
        };
      });
    } catch (error) {
      console.error('Error getting detailed onboarding steps:', error);
      throw error;
    }
  }

  /**
   * Check if onboarding is complete
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    try {
      const progress = await this.getProgress(userId);
      return progress?.currentStep === 'setup_complete' || false;
    } catch (error) {
      console.error('Error checking onboarding completion:', error);
      return false;
    }
  }

  /**
   * Get onboarding statistics
   */
  async getOnboardingStats(userId: string): Promise<{
    totalSteps: number;
    completedSteps: number;
    remainingSteps: number;
    completionPercentage: number;
    estimatedTimeRemaining: number;
    currentStepInfo: OnboardingStepInfo | null;
  }> {
    try {
      const progress = await this.getProgress(userId);
      const detailedSteps = await this.getDetailedSteps(userId);
      
      if (!progress) {
        return {
          totalSteps: this.ONBOARDING_STEPS.length,
          completedSteps: 0,
          remainingSteps: this.ONBOARDING_STEPS.length,
          completionPercentage: 0,
          estimatedTimeRemaining: this.getTotalEstimatedTime(),
          currentStepInfo: null,
        };
      }

      const completedSteps = progress.stepsCompleted.length;
      const remainingSteps = this.ONBOARDING_STEPS.length - completedSteps;
      const currentStepInfo = detailedSteps.find(step => step.isActive) || null;
      
      // Calculate estimated time remaining
      const remainingStepNames = this.ONBOARDING_STEPS.slice(
        this.ONBOARDING_STEPS.indexOf(progress.currentStep)
      );
      const estimatedTimeRemaining = remainingStepNames.reduce(
        (total, stepName) => total + this.STEP_INFO[stepName].estimatedTimeMinutes,
        0
      );

      return {
        totalSteps: this.ONBOARDING_STEPS.length,
        completedSteps,
        remainingSteps,
        completionPercentage: progress.completionPercentage,
        estimatedTimeRemaining,
        currentStepInfo,
      };
    } catch (error) {
      console.error('Error getting onboarding stats:', error);
      throw error;
    }
  }

  /**
   * Reset onboarding progress (for testing)
   */
  async resetProgress(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to reset onboarding progress: ${error.message}`);
      }
    } catch (error) {
      console.error('Error resetting onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Get timestamp field name for a step
   */
  private getTimestampField(step: string): string | null {
    const fieldMap: Record<string, string> = {
      'payment_completed': 'payment_completed_at',
      'profile_form': 'profile_form_completed_at',
      'document_upload': 'document_upload_completed_at',
      'ai_analysis': 'ai_analysis_completed_at',
      'prompt_generation': 'prompt_generation_completed_at',
      'setup_complete': 'setup_completed_at',
    };
    return fieldMap[step] || null;
  }

  /**
   * Convert snake_case to camelCase
   */
  private camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Get total estimated time for all steps
   */
  private getTotalEstimatedTime(): number {
    return Object.values(this.STEP_INFO).reduce(
      (total, step) => total + step.estimatedTimeMinutes,
      0
    );
  }

  /**
   * Map database row to OnboardingProgress interface
   */
  private mapDatabaseToProgress(data: any): OnboardingProgress {
    return {
      id: data.id,
      userId: data.user_id,
      currentStep: data.current_step,
      stepsCompleted: data.steps_completed || [],
      totalSteps: data.total_steps,
      completionPercentage: data.completion_percentage,
      paymentCompletedAt: data.payment_completed_at ? new Date(data.payment_completed_at) : undefined,
      profileFormCompletedAt: data.profile_form_completed_at ? new Date(data.profile_form_completed_at) : undefined,
      documentUploadCompletedAt: data.document_upload_completed_at ? new Date(data.document_upload_completed_at) : undefined,
      aiAnalysisCompletedAt: data.ai_analysis_completed_at ? new Date(data.ai_analysis_completed_at) : undefined,
      promptGenerationCompletedAt: data.prompt_generation_completed_at ? new Date(data.prompt_generation_completed_at) : undefined,
      setupCompletedAt: data.setup_completed_at ? new Date(data.setup_completed_at) : undefined,
      skipDocumentUpload: data.skip_document_upload,
      autoGeneratePrompts: data.auto_generate_prompts,
      startedAt: new Date(data.started_at),
      lastActivityAt: new Date(data.last_activity_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
