import { Phone } from "lucide-react";

const BottomBanner = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/918595270617', '_blank');
  };

  return (
    <div 
      onClick={handleWhatsAppClick}
      className="fixed bottom-0 left-0 right-0 z-50 bg-muted/90 backdrop-blur-sm border-t border-border cursor-pointer hover:bg-muted/95 transition-colors duration-200"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span className="text-center">
            Powered by Mrikal – Data & AI Capability Center – +91-8595270617
          </span>
        </div>
      </div>
    </div>
  );
};

export default BottomBanner;