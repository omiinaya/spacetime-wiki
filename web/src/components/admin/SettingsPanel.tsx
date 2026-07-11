import { LanguageSwitcher } from '../LanguageSwitcher';
import { TrashSettings } from './TrashSettings';

export function SettingsPanel() {
  return (
    <div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Language
            </p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trash Retention
            </p>
          </div>
          <TrashSettings />
        </div>
      </div>
    </div>
  );
}
