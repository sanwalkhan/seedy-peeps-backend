import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateFocusLevelDto {
  @IsNotEmpty()
  @IsEnum(['Low Key', 'Relaxed', 'Neutral', 'Focused', 'Motivated'], {
    message:
      'Focus level must be one of Low-Key, Relaxed, Neutral, Focused, Motivated',
  })
  focusLevel: string;
}
