import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfessionalServicesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Serviços</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Nenhum serviço configurado. A configuração de serviços estará
          disponível em breve.
        </p>
      </CardContent>
    </Card>
  );
}
