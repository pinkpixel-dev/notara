import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames: classNamesProp,
  styles: stylesProp,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className="flex flex-col w-full">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          month_caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          button_previous: cn(
            buttonVariants({ variant: "outline" }),
            "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
          ),
          button_next: cn(
            buttonVariants({ variant: "outline" }),
            "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
          ),
          chevron: "h-5 w-5",
          month_grid: "w-full border-collapse",
          weekday:
            "text-muted-foreground rounded-md w-12 font-normal text-[0.9rem]",
          day: "h-12 w-12 text-center text-sm p-0 relative align-middle",
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-12 w-12 p-0 font-normal aria-selected:opacity-100 data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground data-[today]:bg-accent data-[today]:text-accent-foreground data-[outside]:text-muted-foreground data-[outside]:opacity-50 data-[disabled]:opacity-50"
          ),
          selected:
            "bg-primary text-primary-foreground [&[data-outside]]:text-primary-foreground",
          today: "bg-accent text-accent-foreground",
          outside: "text-muted-foreground opacity-50",
          disabled: "text-muted-foreground opacity-50",
          hidden: "invisible",
          ...(classNamesProp ?? {}),
        }}
        styles={{
          month_grid: { tableLayout: "fixed" },
          day: { padding: 0 },
          ...(stylesProp ?? {}),
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-5 w-5" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-5 w-5" />,
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
