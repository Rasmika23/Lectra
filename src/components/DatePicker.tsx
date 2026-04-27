import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  variant?: 'default' | 'premium';
  fullWidth?: boolean;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  required,
  className,
  variant = 'default',
  fullWidth = false,
  disabled = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const date = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return parse(value, "yyyy-MM-dd", new Date());
    } catch (e) {
      return undefined;
    }
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, "yyyy-MM-dd"));
      setIsOpen(false);
    }
  };

  const isPremium = variant === 'premium';

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", className)}>
      {label && (
        <label
          className={isPremium 
            ? cn("block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5 ml-1", disabled && "opacity-50")
            : cn("text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)]", disabled && "opacity-50")
          }
        >
          {label}
          {required && <span className="text-[var(--color-error)] ml-1">*</span>}
        </label>
      )}
      <Popover open={isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              isPremium && "rounded-xl border-[#E2E8F0] hover:border-blue-400 h-[38px] px-4",
              !isPremium && "rounded-lg border-[#CBD5E1] h-10 px-3",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
